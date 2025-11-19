package com.mrdabak.dinnerservice.service;

import com.mrdabak.dinnerservice.dto.AuthRequest;
import com.mrdabak.dinnerservice.dto.AuthResponse;
import com.mrdabak.dinnerservice.dto.UserDto;
import com.mrdabak.dinnerservice.model.User;
import com.mrdabak.dinnerservice.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public AuthResponse register(AuthRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new RuntimeException("이메일은 필수입니다.");
        }
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new RuntimeException("비밀번호는 필수입니다.");
        }
        if (request.getPassword().length() < 6) {
            throw new RuntimeException("비밀번호는 최소 6자 이상이어야 합니다.");
        }

        String email = request.getEmail().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("이미 등록된 이메일입니다.");
        }

        // Validate role
        String role = request.getRole();
        if (role == null || role.isEmpty()) {
            role = "customer"; // Default to customer
        }
        if (!role.equals("customer") && !role.equals("employee") && !role.equals("admin")) {
            throw new RuntimeException("유효하지 않은 역할입니다. customer, employee, 또는 admin만 가능합니다.");
        }

        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setName(request.getName() != null ? request.getName().trim() : "");
        user.setAddress(request.getAddress() != null ? request.getAddress().trim() : "");
        user.setPhone(request.getPhone() != null ? request.getPhone().trim() : "");
        user.setRole(role);

        User savedUser = userRepository.save(user);
        String token = jwtService.generateToken(savedUser.getId(), savedUser.getEmail(), savedUser.getRole());

        return new AuthResponse(
                "User registered successfully",
                token,
                new UserDto(savedUser.getId(), savedUser.getEmail(), savedUser.getName(),
                        savedUser.getAddress(), savedUser.getPhone(), savedUser.getRole())
        );
    }

    public AuthResponse login(AuthRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new RuntimeException("이메일은 필수입니다.");
        }
        if (request.getPassword() == null || request.getPassword().trim().isEmpty()) {
            throw new RuntimeException("비밀번호는 필수입니다.");
        }

        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    System.out.println("[AuthService] 로그인 실패: 이메일을 찾을 수 없음 - " + email);
                    return new RuntimeException("이메일 또는 비밀번호가 올바르지 않습니다.");
                });

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            System.out.println("[AuthService] 로그인 실패: 비밀번호 불일치 - " + email);
            throw new RuntimeException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }

        System.out.println("[AuthService] 로그인 성공 - " + email + " (ID: " + user.getId() + ", Role: " + user.getRole() + ")");
        String token = jwtService.generateToken(user.getId(), user.getEmail(), user.getRole());

        return new AuthResponse(
                "Login successful",
                token,
                new UserDto(user.getId(), user.getEmail(), user.getName(),
                        user.getAddress(), user.getPhone(), user.getRole())
        );
    }
}

