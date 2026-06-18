package com.moneymanager.investment;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreateInvestmentRequest(
        @NotBlank String name,
        @NotNull InvestmentType type,
        @NotNull @DecimalMin("0.00") BigDecimal investedAmount,
        @NotNull @DecimalMin("0.00") BigDecimal currentValue,
        @NotBlank String currency,
        LocalDate lastValuationDate,
        UUID linkedAccountId
) {
}
