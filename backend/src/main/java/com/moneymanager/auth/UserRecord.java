package com.moneymanager.auth;

import java.util.UUID;

public record UserRecord(
        UUID id,
        String name,
        String email,
        String passwordHash,
        boolean emailVerified,
        String defaultCurrency,
        String timezone,
        int financialMonthStartDay
) {
}
