package com.moneymanager.category;

import java.time.Instant;
import java.util.UUID;

public record CategoryResponse(
        UUID id,
        UUID parentId,
        String name,
        CategoryType type,
        String icon,
        String color,
        boolean systemCategory,
        boolean archived,
        long version,
        Instant createdAt,
        Instant updatedAt
) {
}
