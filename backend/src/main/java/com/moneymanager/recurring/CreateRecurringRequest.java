package com.moneymanager.recurring;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreateRecurringRequest(
        @NotNull UUID accountId,
        UUID categoryId,
        @NotBlank @Size(max = 160) String name,
        @NotNull @DecimalMin("0.01") BigDecimal amount,
        @NotBlank @Pattern(regexp = "^[A-Z]{3}$") String currency,
        @NotNull RecurringFrequency frequency,
        String rrule,
        @NotNull LocalDate startDate,
        LocalDate endDate,
        boolean autoCreate
) {
}
