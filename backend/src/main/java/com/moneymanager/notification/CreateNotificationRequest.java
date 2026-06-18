package com.moneymanager.notification;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.UUID;

public record CreateNotificationRequest(
        @NotBlank @Size(max = 48) String type,
        @NotBlank @Size(max = 160) String title,
        @NotBlank @Size(max = 500) String body,
        Instant scheduledAt,
        String relatedEntityType,
        UUID relatedEntityId,
        boolean enabled
) {
}
