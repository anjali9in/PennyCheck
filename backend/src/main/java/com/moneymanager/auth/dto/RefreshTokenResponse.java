package com.moneymanager.auth.dto;

import java.time.Instant;

public record RefreshTokenResponse(
        String accessToken,
        String refreshToken,
        Instant accessTokenExpiresAt
) {
}
