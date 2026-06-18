package com.moneymanager.exportdata;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/exports")
public class ExportController {

    private final ExportService exportService;

    public ExportController(ExportService exportService) {
        this.exportService = exportService;
    }

    @GetMapping("/transactions")
    ApiResponse<ExportResponse> transactions(@RequestParam(defaultValue = "CSV") ExportFormat format) {
        return ApiResponse.ok(exportService.transactions(CurrentUser.userId(), format));
    }
}
