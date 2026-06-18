package com.moneymanager.importdata;

import java.util.UUID;

public record CategorizationRuleResponse(
        UUID id,
        UUID categoryId,
        String matchType,
        String pattern,
        int priority,
        boolean enabled
) {
}
