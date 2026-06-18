package com.moneymanager.budget;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class BudgetMathTest {

    @Test
    void remainingBudgetUsesBigDecimalArithmetic() {
        BigDecimal budget = new BigDecimal("10000.00");
        BigDecimal spent = new BigDecimal("8125.50");

        assertThat(budget.subtract(spent)).isEqualByComparingTo("1874.50");
    }
}
