package com.moneymanager.account;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;

public record CreateAccountRequest(
        @NotBlank @Size(max = 160) String name,
        @NotNull AccountType type,
        @Size(max = 160) String institution,
        @Pattern(regexp = "^$|^[0-9]{4}$") String lastFourDigits,
        @NotNull @DecimalMin("0.00") BigDecimal openingBalance,
        @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currency,
        @DecimalMin("0.00") BigDecimal creditLimit,
        Integer billingDay,
        Integer paymentDueDay,
        boolean includeInNetWorth,
        @Size(max = 64) String icon,
        @Size(max = 16) String color
) {
}
