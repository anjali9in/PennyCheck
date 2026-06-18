package com.moneymanager.importdata;

import jakarta.validation.constraints.NotBlank;

public record ImportColumnMapping(
        @NotBlank String date,
        @NotBlank String description,
        String debit,
        String credit,
        String amount,
        String direction,
        String reference
) {
}
