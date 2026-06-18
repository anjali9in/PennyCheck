package com.moneymanager.auth;

import com.moneymanager.auth.dto.AcceptedResponse;
import com.moneymanager.auth.dto.AuthResponse;
import com.moneymanager.auth.dto.DeviceRequest;
import com.moneymanager.auth.dto.ForgotPasswordRequest;
import com.moneymanager.auth.dto.LoginRequest;
import com.moneymanager.auth.dto.LogoutRequest;
import com.moneymanager.auth.dto.RefreshTokenRequest;
import com.moneymanager.auth.dto.RefreshTokenResponse;
import com.moneymanager.auth.dto.RegisterRequest;
import com.moneymanager.auth.dto.ResetPasswordRequest;
import com.moneymanager.auth.dto.VerifyEmailRequest;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final AuthRepository authRepository;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final AuthProperties authProperties;
    private final TokenHashing tokenHashing;
    private final PasswordEncoder passwordEncoder;

    public AuthService(
            AuthRepository authRepository,
            JwtService jwtService,
            JwtProperties jwtProperties,
            AuthProperties authProperties,
            TokenHashing tokenHashing,
            PasswordEncoder passwordEncoder
    ) {
        this.authRepository = authRepository;
        this.jwtService = jwtService;
        this.jwtProperties = jwtProperties;
        this.authProperties = authProperties;
        this.tokenHashing = tokenHashing;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletRequest servletRequest) {
        String email = normalizeEmail(request.email());
        enforceRateLimit(email, "REGISTER", clientIp(servletRequest));

        UserRecord user = authRepository.createUser(request.name().trim(), email, passwordEncoder.encode(request.password()));
        UUID deviceId = upsertDevice(user.id(), request.device());
        String verificationToken = createEmailVerificationToken(user.id());
        TokenPair tokenPair = issueTokenPair(user, deviceId, UUID.randomUUID());

        return new AuthResponse(
                tokenPair.accessToken(),
                tokenPair.refreshToken(),
                tokenPair.accessTokenExpiresAt(),
                user.id(),
                deviceId,
                user.email(),
                user.emailVerified(),
                authProperties.exposeDevelopmentTokens() ? verificationToken : null
        );
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest servletRequest) {
        String email = normalizeEmail(request.email());
        enforceRateLimit(email, "LOGIN", clientIp(servletRequest));

        UserRecord user = authRepository.findActiveUserByEmail(email)
                .filter(candidate -> passwordEncoder.matches(request.password(), candidate.passwordHash()))
                .orElseThrow(() -> new AuthException("INVALID_CREDENTIALS", "Invalid email or password"));

        UUID deviceId = upsertDevice(user.id(), request.device());
        TokenPair tokenPair = issueTokenPair(user, deviceId, UUID.randomUUID());

        return new AuthResponse(
                tokenPair.accessToken(),
                tokenPair.refreshToken(),
                tokenPair.accessTokenExpiresAt(),
                user.id(),
                deviceId,
                user.email(),
                user.emailVerified(),
                null
        );
    }

    @Transactional
    public RefreshTokenResponse refresh(RefreshTokenRequest request) {
        String tokenHash = tokenHashing.sha256(request.refreshToken());
        RefreshTokenRecord existing = authRepository.findRefreshToken(tokenHash)
                .orElseThrow(() -> new AuthException("INVALID_REFRESH_TOKEN", "Refresh token is invalid"));

        if (existing.revokedAt() != null || existing.expiresAt().isBefore(Instant.now())) {
            throw new AuthException("INVALID_REFRESH_TOKEN", "Refresh token is expired or revoked");
        }
        if (authRepository.isDeviceRemoteLoggedOut(existing.userId(), existing.deviceId())) {
            authRepository.revokeRefreshToken(tokenHash);
            throw new AuthException("DEVICE_LOGGED_OUT", "This device has been logged out");
        }

        UserRecord user = authRepository.findActiveUserById(existing.userId())
                .orElseThrow(() -> new AuthException("USER_NOT_FOUND", "User was not found"));
        TokenPair tokenPair = issueTokenPair(user, existing.deviceId(), existing.familyId());
        authRepository.rotateRefreshToken(existing.id(), tokenPair.refreshTokenId());
        authRepository.touchDevice(existing.deviceId());

        return new RefreshTokenResponse(tokenPair.accessToken(), tokenPair.refreshToken(), tokenPair.accessTokenExpiresAt());
    }

    @Transactional
    public AcceptedResponse logout(LogoutRequest request) {
        authRepository.revokeRefreshToken(tokenHashing.sha256(request.refreshToken()));
        return new AcceptedResponse(true, null);
    }

    @Transactional
    public AcceptedResponse verifyEmail(VerifyEmailRequest request) {
        UUID userId = authRepository.consumeEmailVerificationToken(tokenHashing.sha256(request.token()))
                .orElseThrow(() -> new AuthException("INVALID_EMAIL_TOKEN", "Email verification token is invalid or expired"));
        authRepository.markEmailVerified(userId);
        return new AcceptedResponse(true, null);
    }

    @Transactional
    public AcceptedResponse forgotPassword(ForgotPasswordRequest request, HttpServletRequest servletRequest) {
        String email = normalizeEmail(request.email());
        enforceRateLimit(email, "FORGOT_PASSWORD", clientIp(servletRequest));

        String token = authRepository.findActiveUserByEmail(email)
                .map(user -> {
                    String resetToken = tokenHashing.newOpaqueToken();
                    authRepository.createPasswordResetToken(
                            user.id(),
                            tokenHashing.sha256(resetToken),
                            Instant.now().plus(30, ChronoUnit.MINUTES)
                    );
                    return resetToken;
                })
                .orElse(null);

        return new AcceptedResponse(true, authProperties.exposeDevelopmentTokens() ? token : null);
    }

    @Transactional
    public AcceptedResponse resetPassword(ResetPasswordRequest request, HttpServletRequest servletRequest) {
        enforceRateLimit("reset-password", "RESET_PASSWORD", clientIp(servletRequest));
        UUID userId = authRepository.consumePasswordResetToken(tokenHashing.sha256(request.token()))
                .orElseThrow(() -> new AuthException("INVALID_RESET_TOKEN", "Password reset token is invalid or expired"));
        authRepository.updatePassword(userId, passwordEncoder.encode(request.newPassword()));
        return new AcceptedResponse(true, null);
    }

    private UUID upsertDevice(UUID userId, DeviceRequest request) {
        String fingerprintHash = tokenHashing.sha256(request.deviceFingerprint());
        String pushTokenHash = request.pushToken() == null || request.pushToken().isBlank()
                ? null
                : tokenHashing.sha256(request.pushToken());
        return authRepository.upsertDevice(userId, request, fingerprintHash, pushTokenHash);
    }

    private String createEmailVerificationToken(UUID userId) {
        String verificationToken = tokenHashing.newOpaqueToken();
        authRepository.createEmailVerificationToken(
                userId,
                tokenHashing.sha256(verificationToken),
                Instant.now().plus(24, ChronoUnit.HOURS)
        );
        return verificationToken;
    }

    private TokenPair issueTokenPair(UserRecord user, UUID deviceId, UUID familyId) {
        String refreshToken = tokenHashing.newOpaqueToken();
        Instant accessTokenExpiresAt = Instant.now().plus(jwtProperties.accessTokenMinutes(), ChronoUnit.MINUTES);
        RefreshTokenRecord refreshTokenRecord = authRepository.createRefreshToken(
                user.id(),
                deviceId,
                tokenHashing.sha256(refreshToken),
                familyId,
                Instant.now().plus(jwtProperties.refreshTokenDays(), ChronoUnit.DAYS)
        );
        return new TokenPair(
                refreshTokenRecord.id(),
                jwtService.createAccessToken(user.id(), deviceId, user.email()),
                refreshToken,
                accessTokenExpiresAt
        );
    }

    private void enforceRateLimit(String subject, String eventType, String ipAddress) {
        Instant since = Instant.now().minus(authProperties.rateLimitWindowSeconds(), ChronoUnit.SECONDS);
        int recentAttempts = authRepository.countRecentAuthEvents(subject, eventType, since);
        if (recentAttempts >= authProperties.maxAuthAttempts()) {
            throw new AuthException("RATE_LIMITED", "Too many authentication attempts. Try again later.");
        }
        authRepository.insertAuthEvent(subject, eventType, ipAddress);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private record TokenPair(
            UUID refreshTokenId,
            String accessToken,
            String refreshToken,
            Instant accessTokenExpiresAt
    ) {
    }
}
