package com.moneymanager.budget;

import com.moneymanager.audit.AuditService;
import com.moneymanager.auth.AuthenticatedUser;
import com.moneymanager.category.CategoryRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BudgetService {

    private final BudgetRepository budgetRepository;
    private final CategoryRepository categoryRepository;
    private final AuditService auditService;

    public BudgetService(BudgetRepository budgetRepository, CategoryRepository categoryRepository, AuditService auditService) {
        this.budgetRepository = budgetRepository;
        this.categoryRepository = categoryRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<BudgetResponse> list(UUID userId) {
        return budgetRepository.list(userId);
    }

    @Transactional
    public BudgetResponse create(AuthenticatedUser user, CreateBudgetRequest request) {
        if (request.categoryIds() != null) {
            for (UUID categoryId : request.categoryIds()) {
                if (!categoryRepository.exists(user.userId(), categoryId)) {
                    throw new IllegalArgumentException("Budget category was not found");
                }
            }
        }
        BudgetResponse budget = budgetRepository.create(user.userId(), request);
        auditService.record(user.userId(), user.deviceId(), "BUDGET_CREATED", "budgets", budget.id(),
                Map.of("amount", budget.amount(), "periodType", budget.periodType().name()));
        return budget;
    }

    @Transactional
    public void delete(AuthenticatedUser user, UUID budgetId) {
        budgetRepository.delete(user.userId(), budgetId);
        auditService.record(user.userId(), user.deviceId(), "BUDGET_DELETED", "budgets", budgetId, Map.of());
    }
}
