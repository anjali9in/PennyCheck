package com.moneymanager.transaction;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record CreateTransactionRequest(
        @NotNull UUID accountId,
        UUID categoryId,
        @NotNull TransactionType type,
        @NotNull TransactionDirection direction,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        @Pattern(regexp = "^[A-Z]{3}$") String currency,
        @Size(max = 180) String merchant,
        @NotNull Instant occurredAt,
        @Size(max = 80) String paymentMethod,
        @Size(max = 2000) String notes,
        @Size(max = 120) String referenceNumber,
        TransactionStatus status
) {
}
