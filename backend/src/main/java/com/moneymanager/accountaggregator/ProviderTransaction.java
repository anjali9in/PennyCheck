package com.moneymanager.accountaggregator;

import java.math.BigDecimal;
import java.time.Instant;

public record ProviderTransaction(
        String referenceNumber,
        Instant occurredAt,
        String narration,
        BigDecimal amount,
        String direction,
        String currency
) {
}
