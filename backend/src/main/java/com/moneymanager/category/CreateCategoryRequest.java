package com.moneymanager.category;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CreateCategoryRequest(
        UUID parentId,
        @NotBlank @Size(max = 120) String name,
        @NotNull CategoryType type,
        @Size(max = 64) String icon,
        @Size(max = 16) String color
) {
}
