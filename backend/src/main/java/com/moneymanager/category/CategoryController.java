package com.moneymanager.category;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/categories")
public class CategoryController {

    private final CategoryService categoryService;

    public CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
    }

    @GetMapping
    ApiResponse<List<CategoryResponse>> list(@RequestParam(required = false) CategoryType type) {
        return ApiResponse.ok(categoryService.list(CurrentUser.userId(), type));
    }

    @PostMapping
    ApiResponse<CategoryResponse> create(@Valid @RequestBody CreateCategoryRequest request) {
        return ApiResponse.ok(categoryService.create(CurrentUser.get(), request));
    }

    @DeleteMapping("/{categoryId}")
    ApiResponse<Void> archive(@PathVariable UUID categoryId) {
        categoryService.archive(CurrentUser.get(), categoryId);
        return ApiResponse.ok(null);
    }
}
