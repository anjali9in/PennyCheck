package com.moneymanager.reports;

import java.util.List;

public record ReportSummaryResponse(
        MonthlyCashflowResponse currentMonth,
        NetWorthResponse netWorth,
        List<CategorySpendResponse> topExpenseCategories
) {
}
