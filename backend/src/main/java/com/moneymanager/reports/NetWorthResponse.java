package com.moneymanager.reports;

import java.math.BigDecimal;

public record NetWorthResponse(
        BigDecimal cashAndAccounts,
        BigDecimal investments,
        BigDecimal liabilities,
        BigDecimal netWorth
) {
}
