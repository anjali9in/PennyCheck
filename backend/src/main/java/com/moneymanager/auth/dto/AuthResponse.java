package com.moneymanager.auth.dto;

import java.time.Instant;
import java.util.UUID;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        Instant accessTokenExpiresAt,
        UUID userId,
        UUID deviceId,
        String email,
        boolean emailVerified,
        String developmentEmailVerificationToken
) {
}
