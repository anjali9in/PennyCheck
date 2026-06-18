package com.moneymanager.importdata;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CategorizationRuleRequest(
        @NotNull UUID categoryId,
        @NotBlank String matchType,
        @NotBlank String pattern,
        int priority,
        boolean enabled
) {
}
