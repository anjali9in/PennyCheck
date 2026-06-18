package com.moneymanager.sync;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;

public record SyncChangeRequest(
        @NotBlank String clientChangeId,
        @NotBlank String entityType,
        @NotBlank String entityId,
        @NotNull SyncOperation operation,
        @NotNull JsonNode payload,
        Long baseVersion,
        Instant updatedAt
) {
}
