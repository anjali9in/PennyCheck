package com.moneymanager.loan;

import java.math.BigDecimal;

public record EmiCalculationResponse(
        BigDecimal principal,
        BigDecimal annualInterestRate,
        int tenureMonths,
        BigDecimal emiAmount,
        BigDecimal totalPayment,
        BigDecimal totalInterest
) {
}
