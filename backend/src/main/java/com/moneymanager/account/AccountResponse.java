package com.moneymanager.account;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record AccountResponse(
        UUID id,
        String name,
        AccountType type,
        String institution,
        String lastFourDigits,
        BigDecimal openingBalance,
        BigDecimal currentBalance,
        String currency,
        BigDecimal creditLimit,
        Integer billingDay,
        Integer paymentDueDay,
        boolean includeInNetWorth,
        String icon,
        String color,
        boolean archived,
        long version,
        Instant createdAt,
        Instant updatedAt
) {
}
