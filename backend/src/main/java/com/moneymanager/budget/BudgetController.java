package com.moneymanager.budget;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/budgets")
public class BudgetController {

    private final BudgetService budgetService;

    public BudgetController(BudgetService budgetService) {
        this.budgetService = budgetService;
    }

    @GetMapping
    ApiResponse<List<BudgetResponse>> list() {
        return ApiResponse.ok(budgetService.list(CurrentUser.userId()));
    }

    @PostMapping
    ApiResponse<BudgetResponse> create(@Valid @RequestBody CreateBudgetRequest request) {
        return ApiResponse.ok(budgetService.create(CurrentUser.get(), request));
    }

    @DeleteMapping("/{budgetId}")
    ApiResponse<Void> delete(@PathVariable UUID budgetId) {
        budgetService.delete(CurrentUser.get(), budgetId);
        return ApiResponse.ok(null);
    }
}
