package com.moneymanager.user;

import java.time.Instant;
import java.util.UUID;

public record DeviceResponse(
        UUID id,
        String deviceName,
        String platform,
        Instant lastSeenAt,
        Instant remoteLoggedOutAt,
        Instant createdAt
) {
}
