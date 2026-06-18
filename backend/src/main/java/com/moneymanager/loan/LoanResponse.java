package com.moneymanager.loan;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LoanResponse(
        UUID id,
        UUID accountId,
        String name,
        BigDecimal principal,
        BigDecimal annualInterestRate,
        int tenureMonths,
        BigDecimal emiAmount,
        BigDecimal outstandingPrincipal,
        LocalDate startDate,
        long version,
        Instant createdAt,
        Instant updatedAt
) {
}
