package com.moneymanager.sync;

import com.fasterxml.jackson.databind.JsonNode;
import java.time.Instant;
import java.util.UUID;

public record SyncChangeResponse(
        UUID id,
        String clientChangeId,
        String entityType,
        String entityId,
        SyncOperation operation,
        JsonNode payload,
        Long baseVersion,
        long serverVersion,
        String status,
        String conflictReason,
        Instant createdAt
) {
}
