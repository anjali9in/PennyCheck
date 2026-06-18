package com.moneymanager.reports;

import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ReportService {

    private final ReportRepository reportRepository;

    public ReportService(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    public ReportSummaryResponse summary(UUID userId) {
        return new ReportSummaryResponse(
                reportRepository.currentMonthCashflow(userId),
                reportRepository.netWorth(userId),
                reportRepository.topExpenseCategories(userId)
        );
    }
}
