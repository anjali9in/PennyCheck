package com.moneymanager.reports;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/summary")
    ApiResponse<ReportSummaryResponse> summary() {
        return ApiResponse.ok(reportService.summary(CurrentUser.userId()));
    }
}
