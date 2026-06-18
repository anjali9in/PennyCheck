package com.moneymanager.loan;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class EmiCalculatorTest {

    @Test
    void calculatesMonthlyEmi() {
        EmiCalculationResponse response = EmiCalculator.calculate(new BigDecimal("1000000"), new BigDecimal("8.5"), 240);

        assertThat(response.emiAmount()).isEqualByComparingTo("8678.23");
        assertThat(response.totalInterest()).isGreaterThan(new BigDecimal("1000000"));
    }

    @Test
    void handlesZeroInterestLoans() {
        EmiCalculationResponse response = EmiCalculator.calculate(new BigDecimal("120000"), BigDecimal.ZERO, 12);

        assertThat(response.emiAmount()).isEqualByComparingTo("10000.00");
        assertThat(response.totalInterest()).isEqualByComparingTo("0.00");
    }
}
