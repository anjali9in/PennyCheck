package com.moneymanager.budget;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record BudgetResponse(
        UUID id,
        String name,
        BudgetPeriodType periodType,
        LocalDate startDate,
        LocalDate endDate,
        BigDecimal amount,
        BigDecimal spent,
        BigDecimal remaining,
        String currency,
        boolean rolloverEnabled,
        BigDecimal alertThresholdPercent,
        List<UUID> categoryIds,
        long version,
        Instant createdAt,
        Instant updatedAt
) {
}
