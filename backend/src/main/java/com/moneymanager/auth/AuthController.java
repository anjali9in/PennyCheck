package com.moneymanager.auth;

import com.moneymanager.auth.dto.AcceptedResponse;
import com.moneymanager.auth.dto.AuthResponse;
import com.moneymanager.auth.dto.ForgotPasswordRequest;
import com.moneymanager.auth.dto.LoginRequest;
import com.moneymanager.auth.dto.LogoutRequest;
import com.moneymanager.auth.dto.RefreshTokenRequest;
import com.moneymanager.auth.dto.RefreshTokenResponse;
import com.moneymanager.auth.dto.RegisterRequest;
import com.moneymanager.auth.dto.ResetPasswordRequest;
import com.moneymanager.auth.dto.VerifyEmailRequest;
import com.moneymanager.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    ApiResponse<AuthResponse> register(@Valid @RequestBody RegisterRequest request, HttpServletRequest servletRequest) {
        return ApiResponse.ok(authService.register(request, servletRequest));
    }

    @PostMapping("/login")
    ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        return ApiResponse.ok(authService.login(request, servletRequest));
    }

    @PostMapping("/refresh")
    ApiResponse<RefreshTokenResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.ok(authService.refresh(request));
    }

    @PostMapping("/logout")
    ApiResponse<AcceptedResponse> logout(@Valid @RequestBody LogoutRequest request) {
        return ApiResponse.ok(authService.logout(request));
    }

    @PostMapping("/verify-email")
    ApiResponse<AcceptedResponse> verifyEmail(@Valid @RequestBody VerifyEmailRequest request) {
        return ApiResponse.ok(authService.verifyEmail(request));
    }

    @PostMapping("/forgot-password")
    ApiResponse<AcceptedResponse> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request, HttpServletRequest servletRequest) {
        return ApiResponse.ok(authService.forgotPassword(request, servletRequest));
    }

    @PostMapping("/reset-password")
    ApiResponse<AcceptedResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request, HttpServletRequest servletRequest) {
        return ApiResponse.ok(authService.resetPassword(request, servletRequest));
    }
}
