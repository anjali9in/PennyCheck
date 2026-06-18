package com.moneymanager.reports;

import java.math.BigDecimal;
import java.time.YearMonth;

public record MonthlyCashflowResponse(
        YearMonth month,
        BigDecimal income,
        BigDecimal expenses,
        BigDecimal savings
) {
}
