package com.moneymanager.reports;

import java.math.BigDecimal;
import java.util.UUID;

public record CategorySpendResponse(
        UUID categoryId,
        String categoryName,
        BigDecimal amount
) {
}
