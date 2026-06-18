package com.moneymanager.investment;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/investments")
public class InvestmentController {

    private final InvestmentService investmentService;

    public InvestmentController(InvestmentService investmentService) {
        this.investmentService = investmentService;
    }

    @GetMapping
    ApiResponse<List<InvestmentResponse>> list() {
        return ApiResponse.ok(investmentService.list(CurrentUser.userId()));
    }

    @PostMapping
    ApiResponse<InvestmentResponse> create(@Valid @RequestBody CreateInvestmentRequest request) {
        return ApiResponse.ok(investmentService.create(CurrentUser.userId(), request));
    }
}
