package com.moneymanager.recurring;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record SubscriptionResponse(
        UUID id,
        String merchant,
        BigDecimal amount,
        String currency,
        String billingFrequency,
        Instant lastChargedAt,
        boolean priceIncreaseDetected
) {
}
