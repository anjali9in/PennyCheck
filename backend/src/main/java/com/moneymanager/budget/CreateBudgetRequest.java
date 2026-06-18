package com.moneymanager.budget;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateBudgetRequest(
        @NotBlank @Size(max = 160) String name,
        @NotNull BudgetPeriodType periodType,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currency,
        boolean rolloverEnabled,
        @DecimalMin("1.00") BigDecimal alertThresholdPercent,
        List<UUID> categoryIds
) {
}
