package com.moneymanager.loan;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;

public final class EmiCalculator {

    private static final MathContext MC = new MathContext(20, RoundingMode.HALF_UP);

    private EmiCalculator() {
    }

    public static EmiCalculationResponse calculate(BigDecimal principal, BigDecimal annualInterestRate, int tenureMonths) {
        if (tenureMonths <= 0) {
            throw new IllegalArgumentException("Tenure must be greater than zero");
        }
        if (principal.compareTo(BigDecimal.ZERO) < 0 || annualInterestRate.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Loan values cannot be negative");
        }

        BigDecimal emi;
        if (annualInterestRate.compareTo(BigDecimal.ZERO) == 0) {
            emi = principal.divide(BigDecimal.valueOf(tenureMonths), 2, RoundingMode.HALF_UP);
        } else {
            BigDecimal monthlyRate = annualInterestRate
                    .divide(BigDecimal.valueOf(100), MC)
                    .divide(BigDecimal.valueOf(12), MC);
            BigDecimal compound = BigDecimal.ONE.add(monthlyRate, MC).pow(tenureMonths, MC);
            emi = principal.multiply(monthlyRate, MC)
                    .multiply(compound, MC)
                    .divide(compound.subtract(BigDecimal.ONE, MC), 2, RoundingMode.HALF_UP);
        }

        BigDecimal totalPayment = emi.multiply(BigDecimal.valueOf(tenureMonths)).setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalInterest = totalPayment.subtract(principal).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
        return new EmiCalculationResponse(
                principal.setScale(2, RoundingMode.HALF_UP),
                annualInterestRate,
                tenureMonths,
                emi,
                totalPayment,
                totalInterest
        );
    }
}
