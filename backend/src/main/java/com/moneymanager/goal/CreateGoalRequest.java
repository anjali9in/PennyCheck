package com.moneymanager.goal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreateGoalRequest(
        @NotBlank String name,
        @NotNull GoalType type,
        @NotNull @DecimalMin("0.00") BigDecimal targetAmount,
        @DecimalMin("0.00") BigDecimal currentAmount,
        @NotBlank String currency,
        LocalDate targetDate,
        UUID linkedAccountId
) {
}
