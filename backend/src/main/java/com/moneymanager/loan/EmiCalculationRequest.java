package com.moneymanager.loan;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record EmiCalculationRequest(
        @NotNull @DecimalMin("0.00") BigDecimal principal,
        @NotNull @DecimalMin("0.00") BigDecimal annualInterestRate,
        @Min(1) int tenureMonths
) {
}
