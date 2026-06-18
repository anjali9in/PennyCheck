package com.moneymanager.creditcard;

import java.math.BigDecimal;
import java.util.UUID;

public record CreditCardSummary(
        UUID accountId,
        String name,
        String currency,
        BigDecimal currentBalance,
        BigDecimal creditLimit,
        BigDecimal availableCredit,
        BigDecimal utilizationPercent,
        Integer billingDay,
        Integer paymentDueDay
) {
}
