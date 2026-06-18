package com.moneymanager.exportdata;

import java.math.BigDecimal;
import java.time.Instant;

public record ExportTransactionRow(
        Instant occurredAt,
        String accountName,
        String categoryName,
        String type,
        String direction,
        BigDecimal amount,
        String currency,
        String merchant,
        String referenceNumber,
        String notes
) {
}
