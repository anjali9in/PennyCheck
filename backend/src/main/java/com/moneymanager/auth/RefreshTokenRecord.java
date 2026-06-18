package com.moneymanager.auth;

import java.time.Instant;
import java.util.UUID;

public record RefreshTokenRecord(
        UUID id,
        UUID userId,
        UUID deviceId,
        String tokenHash,
        UUID familyId,
        Instant expiresAt,
        Instant revokedAt
) {
}
