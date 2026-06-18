package com.moneymanager.category;

import com.moneymanager.audit.AuditService;
import com.moneymanager.auth.AuthenticatedUser;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final AuditService auditService;

    public CategoryService(CategoryRepository categoryRepository, AuditService auditService) {
        this.categoryRepository = categoryRepository;
        this.auditService = auditService;
    }

    @Transactional
    public List<CategoryResponse> list(UUID userId, CategoryType type) {
        categoryRepository.ensureDefaultCategories(userId);
        return categoryRepository.list(userId, type);
    }

    @Transactional
    public CategoryResponse create(AuthenticatedUser user, CreateCategoryRequest request) {
        if (request.parentId() != null && !categoryRepository.exists(user.userId(), request.parentId())) {
            throw new IllegalArgumentException("Parent category was not found");
        }
        CategoryResponse category = categoryRepository.create(user.userId(), request, false);
        auditService.record(user.userId(), user.deviceId(), "CATEGORY_CREATED", "categories", category.id(),
                Map.of("type", category.type().name()));
        return category;
    }

    @Transactional
    public void archive(AuthenticatedUser user, UUID categoryId) {
        categoryRepository.archive(user.userId(), categoryId);
        auditService.record(user.userId(), user.deviceId(), "CATEGORY_ARCHIVED", "categories", categoryId, Map.of());
    }
}
