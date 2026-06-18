package com.moneymanager.transaction;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record TransactionResponse(
        UUID id,
        UUID accountId,
        UUID destinationAccountId,
        UUID categoryId,
        UUID transferGroupId,
        TransactionType type,
        TransactionDirection direction,
        BigDecimal amount,
        String currency,
        String merchant,
        Instant occurredAt,
        String paymentMethod,
        String notes,
        String referenceNumber,
        TransactionStatus status,
        String source,
        long version,
        Instant createdAt,
        Instant updatedAt
) {
}
