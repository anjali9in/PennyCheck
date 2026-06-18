package com.moneymanager.notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String type,
        String title,
        String body,
        Instant scheduledAt,
        Instant deliveredAt,
        Instant readAt,
        boolean enabled
) {
}
