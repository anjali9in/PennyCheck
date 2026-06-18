package com.moneymanager.investment;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record InvestmentResponse(
        UUID id,
        UUID linkedAccountId,
        String name,
        InvestmentType type,
        BigDecimal investedAmount,
        BigDecimal currentValue,
        BigDecimal gainLoss,
        BigDecimal gainLossPercent,
        String currency,
        LocalDate lastValuationDate,
        long version,
        Instant createdAt,
        Instant updatedAt
) {
}
