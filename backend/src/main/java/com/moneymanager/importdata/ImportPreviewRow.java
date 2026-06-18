package com.moneymanager.importdata;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public record ImportPreviewRow(
        UUID rowId,
        int rowNumber,
        Instant occurredAt,
        String description,
        BigDecimal amount,
        String direction,
        String merchant,
        String referenceNumber,
        UUID suggestedCategoryId,
        String duplicateStatus,
        String rowStatus,
        List<String> errors,
        Map<String, String> raw
) {
}
