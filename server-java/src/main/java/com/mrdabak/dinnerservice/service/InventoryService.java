package com.mrdabak.dinnerservice.service;

import com.mrdabak.dinnerservice.dto.OrderItemDto;
import com.mrdabak.dinnerservice.model.InventoryReservation;
import com.mrdabak.dinnerservice.model.MenuInventory;
import com.mrdabak.dinnerservice.repository.InventoryReservationRepository;
import com.mrdabak.dinnerservice.repository.MenuInventoryRepository;
import com.mrdabak.dinnerservice.repository.MenuItemRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.*;

@Service
public class InventoryService {

    private final MenuInventoryRepository menuInventoryRepository;
    private final InventoryReservationRepository inventoryReservationRepository;
    private final MenuItemRepository menuItemRepository;

    private final List<DayOfWeek> restockDays;
    private final LocalTime restockTime;
    private final int defaultCapacity;

    public InventoryService(MenuInventoryRepository menuInventoryRepository,
                            InventoryReservationRepository inventoryReservationRepository,
                            MenuItemRepository menuItemRepository,
                            @Value("${inventory.restock.days:MONDAY,FRIDAY}") String restockDaysProperty,
                            @Value("${inventory.restock.time:06:00}") String restockTimeProperty,
                            @Value("${inventory.default.capacity:20}") int defaultCapacity) {
        this.menuInventoryRepository = menuInventoryRepository;
        this.inventoryReservationRepository = inventoryReservationRepository;
        this.menuItemRepository = menuItemRepository;
        this.restockDays = parseRestockDays(restockDaysProperty);
        this.restockTime = LocalTime.parse(restockTimeProperty);
        this.defaultCapacity = defaultCapacity;
    }

    public InventoryReservationPlan prepareReservations(List<OrderItemDto> items, LocalDateTime deliveryTime) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("At least one menu item is required for reservation");
        }
        if (deliveryTime == null) {
            throw new IllegalArgumentException("Delivery time is required for inventory reservation");
        }

        RestockWindow window = resolveWindow(deliveryTime);
        Map<Long, Integer> aggregated = aggregateQuantities(items);

        Map<Long, MenuInventory> inventoryMap = new HashMap<>();
        for (Long menuItemId : aggregated.keySet()) {
            MenuInventory inventory = getInventory(menuItemId);
            inventoryMap.put(menuItemId, inventory);
            validateCapacity(menuItemId, inventory, aggregated.get(menuItemId), window);
        }

        return new InventoryReservationPlan(window, aggregated, deliveryTime);
    }

    @Transactional("transactionManager")
    public void commitReservations(Long orderId, InventoryReservationPlan plan) {
        if (orderId == null) {
            throw new IllegalArgumentException("주문 ID는 필수입니다.");
        }
        if (plan == null || plan.quantities() == null || plan.quantities().isEmpty()) {
            throw new IllegalArgumentException("재고 예약 계획은 필수입니다.");
        }

        for (Map.Entry<Long, Integer> entry : plan.quantities().entrySet()) {
            Long menuItemId = entry.getKey();
            Integer quantity = entry.getValue();
            
            // Verify menu item exists
            if (!menuItemRepository.existsById(menuItemId)) {
                throw new RuntimeException("메뉴 아이템을 찾을 수 없습니다: " + menuItemId);
            }
            
            // Re-validate capacity (race condition prevention)
            MenuInventory inventory = getInventory(menuItemId);
            validateCapacity(menuItemId, inventory, quantity, plan.window());

            InventoryReservation reservation = new InventoryReservation();
            reservation.setOrderId(orderId);
            reservation.setMenuItemId(menuItemId);
            reservation.setQuantity(quantity);
            reservation.setWindowStart(plan.window().start());
            reservation.setWindowEnd(plan.window().end());
            reservation.setDeliveryTime(plan.deliveryTime());
            inventoryReservationRepository.save(reservation);
        }
    }

    @Transactional("transactionManager")
    public void releaseReservationsForOrder(Long orderId) {
        if (orderId == null) {
            throw new IllegalArgumentException("주문 ID는 필수입니다.");
        }
        
        try {
            List<InventoryReservation> reservations = inventoryReservationRepository.findByOrderId(orderId);
            if (reservations.isEmpty()) {
                System.out.println("[InventoryService] 주문 " + orderId + "에 대한 재고 예약이 없습니다.");
                return;
            }
            
            int count = reservations.size();
            inventoryReservationRepository.deleteByOrderId(orderId);
            System.out.println("[InventoryService] 주문 " + orderId + "의 재고 예약 " + count + "개가 취소되었습니다.");
        } catch (Exception e) {
            System.err.println("[InventoryService] 재고 예약 취소 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("재고 예약 취소 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    @Transactional("transactionManager")
    public void consumeReservationsForOrder(Long orderId) {
        if (orderId == null) {
            throw new IllegalArgumentException("주문 ID는 필수입니다.");
        }
        
        try {
            List<InventoryReservation> reservations = inventoryReservationRepository.findByOrderId(orderId);
            if (reservations.isEmpty()) {
                System.out.println("[InventoryService] 주문 " + orderId + "에 대한 재고 예약이 없습니다. (이미 소진되었거나 예약이 없었습니다.)");
                // This is not necessarily an error - order might have been created without inventory reservation
                // or already consumed. We'll allow this to proceed.
                return;
            }

            // Delete reservations (consuming them)
            int count = reservations.size();
            inventoryReservationRepository.deleteByOrderId(orderId);
            System.out.println("[InventoryService] 주문 " + orderId + "의 재고 예약 " + count + "개가 소진되었습니다.");
        } catch (Exception e) {
            System.err.println("[InventoryService] 재고 소진 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("재고 소진 처리 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<InventorySnapshot> getInventorySnapshots() {
        LocalDateTime now = LocalDateTime.now();
        RestockWindow currentWindow = resolveWindow(now);

        return menuInventoryRepository.findAll().stream().map(inventory -> {
            Integer reserved = inventoryReservationRepository
                    .sumQuantityByMenuItemIdAndWindowStart(inventory.getMenuItemId(), currentWindow.start());
            if (reserved == null) {
                reserved = 0;
            }
            return new InventorySnapshot(
                    inventory,
                    reserved,
                    inventory.getCapacityPerWindow() - reserved,
                    currentWindow.start(),
                    currentWindow.end()
            );
        }).toList();
    }

    @Transactional("transactionManager")
    public MenuInventory restock(Long menuItemId, int newCapacity, String notes) {
        if (menuItemId == null) {
            throw new IllegalArgumentException("메뉴 아이템 ID는 필수입니다.");
        }
        if (newCapacity <= 0) {
            throw new IllegalArgumentException("보충 용량은 0보다 커야 합니다.");
        }
        
        // Verify menu item exists
        if (!menuItemRepository.existsById(menuItemId)) {
            throw new RuntimeException("메뉴 아이템을 찾을 수 없습니다: " + menuItemId);
        }
        
        MenuInventory inventory = getInventory(menuItemId);
        inventory.setCapacityPerWindow(newCapacity);
        inventory.setNotes(notes != null ? notes : "");
        inventory.setLastRestockedAt(LocalDateTime.now());
        return menuInventoryRepository.save(inventory);
    }

    private MenuInventory autoCreateInventory(Long menuItemId) {
        MenuInventory inventory = new MenuInventory();
        inventory.setMenuItemId(menuItemId);
        inventory.setCapacityPerWindow(defaultCapacity);
        inventory.setSafetyStock(0);
        inventory.setNotes("auto-initialized");
        try {
            return menuInventoryRepository.save(inventory);
        } catch (DataIntegrityViolationException e) {
            // Another thread created it first; fetch existing row
            return menuInventoryRepository.findByMenuItemId(menuItemId)
                    .orElseThrow(() -> e);
        }
    }

    private Map<Long, Integer> aggregateQuantities(List<OrderItemDto> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("주문 항목이 비어있습니다.");
        }
        Map<Long, Integer> aggregated = new HashMap<>();
        for (OrderItemDto item : items) {
            if (item.getMenuItemId() == null) {
                throw new IllegalArgumentException("메뉴 아이템 ID는 필수입니다.");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0) {
                throw new IllegalArgumentException("메뉴 아이템 수량은 1 이상이어야 합니다.");
            }
            aggregated.merge(item.getMenuItemId(), item.getQuantity(), Integer::sum);
        }
        return aggregated;
    }

    private void validateCapacity(Long menuItemId, MenuInventory inventory, Integer requestedQuantity, RestockWindow window) {
        Integer alreadyReserved = inventoryReservationRepository
                .sumQuantityByMenuItemIdAndWindowStart(menuItemId, window.start());
        if (alreadyReserved == null) {
            alreadyReserved = 0;
        }
        int projected = alreadyReserved + requestedQuantity;
        if (projected > inventory.getCapacityPerWindow()) {
            String menuName = menuItemRepository.findById(menuItemId)
                    .map(item -> item.getName() + "(" + item.getNameEn() + ")")
                    .orElse("menu item " + menuItemId);
            throw new RuntimeException(String.format(
                    "%s 재고가 부족합니다. (요청: %d, 현재 예약: %d, 최대: %d)",
                    menuName,
                    requestedQuantity,
                    alreadyReserved,
                    inventory.getCapacityPerWindow()
            ));
        }
    }

    private MenuInventory getInventory(Long menuItemId) {
        return menuInventoryRepository.findByMenuItemId(menuItemId)
                .orElseGet(() -> autoCreateInventory(menuItemId));
    }

    private List<DayOfWeek> parseRestockDays(String property) {
        if (property == null || property.isBlank()) {
            return List.of(DayOfWeek.MONDAY, DayOfWeek.FRIDAY);
        }
        return Arrays.stream(property.split(","))
                .map(String::trim)
                .filter(str -> !str.isEmpty())
                .map(String::toUpperCase)
                .map(DayOfWeek::valueOf)
                .toList();
    }

    private RestockWindow resolveWindow(LocalDateTime deliveryTime) {
        LocalDateTime start = findLastRestock(deliveryTime);
        LocalDateTime end = findNextRestock(start.plusMinutes(1));
        return new RestockWindow(start, end);
    }

    private LocalDateTime findLastRestock(LocalDateTime reference) {
        LocalDate date = reference.toLocalDate();
        LocalDateTime candidate = LocalDateTime.of(date, restockTime);
        if (candidate.isAfter(reference)) {
            date = date.minusDays(1);
            candidate = LocalDateTime.of(date, restockTime);
        }
        while (!restockDays.contains(candidate.getDayOfWeek())) {
            date = date.minusDays(1);
            candidate = LocalDateTime.of(date, restockTime);
        }
        return candidate;
    }

    private LocalDateTime findNextRestock(LocalDateTime after) {
        if (restockDays.isEmpty()) {
            throw new IllegalStateException("보충 요일이 설정되지 않았습니다.");
        }
        LocalDate date = after.toLocalDate();
        int maxDays = 14; // Prevent infinite loop (max 2 weeks)
        int attempts = 0;
        while (attempts < maxDays) {
            date = date.plusDays(1);
            attempts++;
            if (restockDays.contains(date.getDayOfWeek())) {
                return LocalDateTime.of(date, restockTime);
            }
        }
        throw new IllegalStateException("다음 보충일을 찾을 수 없습니다. 설정을 확인해주세요.");
    }

    public record InventoryReservationPlan(RestockWindow window,
                                           Map<Long, Integer> quantities,
                                           LocalDateTime deliveryTime) { }

    public record RestockWindow(LocalDateTime start, LocalDateTime end) { }

    public record InventorySnapshot(MenuInventory inventory,
                                    int reserved,
                                    int remaining,
                                    LocalDateTime windowStart,
                                    LocalDateTime windowEnd) { }
}


