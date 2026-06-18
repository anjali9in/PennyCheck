package com.moneymanager.accountaggregator;

public record ProviderAccount(
        String providerAccountId,
        String institution,
        String maskedAccountNumber,
        String accountType
) {
}
