package com.moneymanager.loan;

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
@RequestMapping("/api/v1/loans")
public class LoanController {

    private final LoanService loanService;

    public LoanController(LoanService loanService) {
        this.loanService = loanService;
    }

    @GetMapping
    ApiResponse<List<LoanResponse>> list() {
        return ApiResponse.ok(loanService.list(CurrentUser.userId()));
    }

    @PostMapping
    ApiResponse<LoanResponse> create(@Valid @RequestBody CreateLoanRequest request) {
        return ApiResponse.ok(loanService.create(CurrentUser.userId(), request));
    }

    @PostMapping("/emi")
    ApiResponse<EmiCalculationResponse> calculate(@Valid @RequestBody EmiCalculationRequest request) {
        return ApiResponse.ok(loanService.calculate(request));
    }
}
