package com.moneymanager.accountaggregator;

import java.util.List;

public interface AccountDataProvider {
    List<ProviderAccount> listAccounts(String consentId);

    List<ProviderTransaction> fetchTransactions(String consentId, String providerAccountId);
}
