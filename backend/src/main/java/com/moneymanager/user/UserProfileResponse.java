package com.moneymanager.user;

import java.util.UUID;

public record UserProfileResponse(
        UUID id,
        String name,
        String email,
        boolean emailVerified,
        String defaultCurrency,
        String timezone,
        int financialMonthStartDay
) {
}
