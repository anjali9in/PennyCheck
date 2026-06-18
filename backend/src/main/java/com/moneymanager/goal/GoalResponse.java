package com.moneymanager.goal;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record GoalResponse(
        UUID id,
        UUID linkedAccountId,
        String name,
        GoalType type,
        BigDecimal targetAmount,
        BigDecimal currentAmount,
        String currency,
        LocalDate targetDate,
        BigDecimal progressPercent,
        BigDecimal monthlyRecommendation,
        long version,
        Instant createdAt,
        Instant updatedAt
) {
}
