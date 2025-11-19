package com.mrdabak.dinnerservice.controller;

import com.mrdabak.dinnerservice.model.*;
import com.mrdabak.dinnerservice.repository.*;
import com.mrdabak.dinnerservice.repository.order.OrderRepository;
import com.mrdabak.dinnerservice.repository.order.OrderItemRepository;
import com.mrdabak.dinnerservice.service.DeliverySchedulingService;
import com.mrdabak.dinnerservice.service.ExcelExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/employee")
@PreAuthorize("hasAnyRole('ADMIN', 'EMPLOYEE')")
public class EmployeeController {

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final UserRepository userRepository;
    private final DinnerTypeRepository dinnerTypeRepository;
    private final MenuItemRepository menuItemRepository;
    private final ExcelExportService excelExportService;
    private final DeliverySchedulingService deliverySchedulingService;
    private final com.mrdabak.dinnerservice.service.OrderService orderService;

    public EmployeeController(OrderRepository orderRepository, OrderItemRepository orderItemRepository,
                             UserRepository userRepository, DinnerTypeRepository dinnerTypeRepository,
                             MenuItemRepository menuItemRepository, ExcelExportService excelExportService,
                             DeliverySchedulingService deliverySchedulingService,
                             com.mrdabak.dinnerservice.service.OrderService orderService) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.userRepository = userRepository;
        this.dinnerTypeRepository = dinnerTypeRepository;
        this.menuItemRepository = menuItemRepository;
        this.excelExportService = excelExportService;
        this.deliverySchedulingService = deliverySchedulingService;
        this.orderService = orderService;
    }

    @GetMapping("/orders")
    public ResponseEntity<List<Map<String, Object>>> getOrders(@RequestParam(required = false) String status) {
        List<Order> orders;
        if (status != null && !status.isEmpty()) {
            orders = orderRepository.findByStatus(status);
        } else {
            orders = orderRepository.findAll();
        }

        List<Map<String, Object>> orderDtos = orders.stream().map(order -> {
            Map<String, Object> orderMap = new HashMap<>();
            orderMap.put("id", order.getId());
            orderMap.put("user_id", order.getUserId());
            orderMap.put("dinner_type_id", order.getDinnerTypeId());
            orderMap.put("serving_style", order.getServingStyle());
            orderMap.put("delivery_time", order.getDeliveryTime());
            orderMap.put("delivery_address", order.getDeliveryAddress());
            orderMap.put("total_price", order.getTotalPrice());
            orderMap.put("status", order.getStatus());
            orderMap.put("payment_status", order.getPaymentStatus());
            orderMap.put("created_at", order.getCreatedAt());

            // Add customer information
            User customer = userRepository.findById(order.getUserId()).orElse(null);
            if (customer != null) {
                orderMap.put("customer_name", customer.getName());
                orderMap.put("customer_phone", customer.getPhone());
            }

            // Add dinner type information
            DinnerType dinner = dinnerTypeRepository.findById(order.getDinnerTypeId()).orElse(null);
            if (dinner != null) {
                orderMap.put("dinner_name", dinner.getName());
                orderMap.put("dinner_name_en", dinner.getNameEn());
            }

            List<OrderItem> items = orderItemRepository.findByOrderId(order.getId());
            List<Map<String, Object>> itemDtos = items.stream().map(item -> {
                MenuItem menuItem = menuItemRepository.findById(item.getMenuItemId()).orElse(null);
                Map<String, Object> itemMap = new HashMap<>();
                itemMap.put("id", item.getId());
                itemMap.put("menu_item_id", item.getMenuItemId());
                itemMap.put("quantity", item.getQuantity());
                if (menuItem != null) {
                    itemMap.put("name", menuItem.getName());
                    itemMap.put("name_en", menuItem.getNameEn());
                    itemMap.put("price", menuItem.getPrice());
                }
                return itemMap;
            }).toList();
            orderMap.put("items", itemDtos);
            return orderMap;
        }).toList();

        return ResponseEntity.ok(orderDtos);
    }

    @GetMapping("/delivery-schedule")
    public ResponseEntity<?> getDeliverySchedule(
            @RequestParam(required = false) String date,
            Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "인증이 필요합니다."));
        }
        
        LocalDate targetDate;
        try {
            targetDate = date != null && !date.trim().isEmpty() 
                    ? LocalDate.parse(date) 
                    : LocalDate.now();
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "잘못된 날짜 형식입니다. (예: 2025-01-15)"));
        }
        
        try {
            Long requesterId = Long.parseLong(authentication.getName());
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));

            List<Map<String, Object>> response = deliverySchedulingService
                    .getSchedulesForUser(requesterId, isAdmin, targetDate)
                    .stream()
                    .map(schedule -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", schedule.getId());
                        map.put("order_id", schedule.getOrderId());
                        map.put("employee_id", schedule.getEmployeeId());
                        map.put("delivery_address", schedule.getDeliveryAddress());
                        map.put("departure_time", schedule.getDepartureTime());
                        map.put("arrival_time", schedule.getArrivalTime());
                        map.put("return_time", schedule.getReturnTime());
                        map.put("one_way_minutes", schedule.getOneWayMinutes());
                        map.put("status", schedule.getStatus());
                        userRepository.findById(schedule.getEmployeeId())
                                .ifPresent(user -> {
                                    map.put("employee_name", user.getName());
                                    map.put("employee_phone", user.getPhone());
                                });
                        return map;
                    }).toList();

            return ResponseEntity.ok(response);
        } catch (NumberFormatException e) {
            return ResponseEntity.status(401).body(Map.of("error", "유효하지 않은 사용자 ID입니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "배달 스케줄 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @PatchMapping("/delivery-schedule/{id}/status")
    public ResponseEntity<?> updateDeliveryStatus(@PathVariable Long id,
                                                  @RequestBody Map<String, String> request,
                                                  Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return ResponseEntity.status(401).body(Map.of("error", "인증이 필요합니다."));
        }
        
        try {
            Long requesterId = Long.parseLong(authentication.getName());
            boolean isAdmin = authentication.getAuthorities().stream()
                    .anyMatch(auth -> "ROLE_ADMIN".equals(auth.getAuthority()));

            String status = request.get("status");
            if (status == null || status.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "상태 값은 필수입니다."));
            }

            DeliverySchedule updated = deliverySchedulingService.updateStatus(id, status, requesterId, isAdmin);
            return ResponseEntity.ok(Map.of(
                    "id", updated.getId(),
                    "status", updated.getStatus()
            ));
        } catch (NumberFormatException e) {
            return ResponseEntity.status(401).body(Map.of("error", "유효하지 않은 사용자 ID입니다."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "배달 스케줄 상태 업데이트 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @PatchMapping("/orders/{id}/status")
    public ResponseEntity<?> updateOrderStatus(@PathVariable Long id, @RequestBody Map<String, String> request) {
        try {
            if (id == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "주문 ID는 필수입니다."));
            }

            String status = request.get("status");
            if (status == null || status.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "상태 값은 필수입니다."));
            }

            status = status.trim().toLowerCase();
            if (!List.of("pending", "cooking", "ready", "out_for_delivery", "delivered", "cancelled").contains(status)) {
                return ResponseEntity.badRequest().body(Map.of("error", "유효하지 않은 상태입니다. (pending, cooking, ready, out_for_delivery, delivered, cancelled 중 하나여야 합니다.)"));
            }

            Order order = orderRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("주문을 찾을 수 없습니다: " + id));

            // Prevent invalid status transitions
            if ("cancelled".equals(order.getStatus()) && !"cancelled".equals(status)) {
                return ResponseEntity.badRequest().body(Map.of("error", "취소된 주문의 상태를 변경할 수 없습니다."));
            }
            if ("delivered".equals(order.getStatus()) && !"delivered".equals(status)) {
                return ResponseEntity.badRequest().body(Map.of("error", "배달 완료된 주문의 상태를 변경할 수 없습니다."));
            }

            // If status is being changed to delivered, consume inventory
            if ("delivered".equals(status) && !"delivered".equals(order.getStatus())) {
                try {
                    orderService.markOrderAsDelivered(id);
                    return ResponseEntity.ok(Map.of("message", "주문이 배달 완료로 처리되었고 재고가 소진되었습니다."));
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
                } catch (RuntimeException e) {
                    return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
                } catch (Exception e) {
                    return ResponseEntity.status(500).body(Map.of("error", "배달 완료 처리 중 오류가 발생했습니다: " + e.getMessage()));
                }
            }

            // For other status changes, just update the status
            order.setStatus(status);
            orderRepository.save(order);

            return ResponseEntity.ok(Map.of("message", "주문 상태가 업데이트되었습니다.", "status", status));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "주문 상태 업데이트 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @PostMapping("/orders/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> cancelOrder(@PathVariable Long id, Authentication authentication) {
        try {
            if (id == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "주문 ID는 필수입니다."));
            }

            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(401).body(Map.of("error", "인증이 필요합니다."));
            }

            Long adminId;
            try {
                adminId = Long.parseLong(authentication.getName());
            } catch (NumberFormatException e) {
                return ResponseEntity.status(401).body(Map.of("error", "유효하지 않은 사용자 ID입니다."));
            }

            Order cancelledOrder = orderService.cancelOrder(id, adminId);

            return ResponseEntity.ok(Map.of(
                    "message", "주문이 취소되었습니다. 재고 예약과 배달 스케줄도 함께 취소되었습니다.",
                    "order_id", cancelledOrder.getId(),
                    "status", cancelledOrder.getStatus()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "주문 취소 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @GetMapping("/orders/export")
    public ResponseEntity<byte[]> exportOrdersToExcel(@RequestParam(required = false) String status) {
        try {
            byte[] excelData = excelExportService.exportOrdersToExcel(status);
            
            String filename = "orders_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".xlsx";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", filename);
            headers.setContentLength(excelData.length);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(excelData);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}

