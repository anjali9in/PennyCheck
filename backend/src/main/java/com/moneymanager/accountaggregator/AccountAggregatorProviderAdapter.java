package com.moneymanager.accountaggregator;

import java.util.List;

public class AccountAggregatorProviderAdapter implements AccountDataProvider {

    @Override
    public List<ProviderAccount> listAccounts(String consentId) {
        throw new UnsupportedOperationException("Licensed Account Aggregator provider credentials are not configured");
    }

    @Override
    public List<ProviderTransaction> fetchTransactions(String consentId, String providerAccountId) {
        throw new UnsupportedOperationException("Licensed Account Aggregator provider credentials are not configured");
    }
}
