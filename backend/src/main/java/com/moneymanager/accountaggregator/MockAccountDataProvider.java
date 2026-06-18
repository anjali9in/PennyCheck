package com.moneymanager.accountaggregator;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class MockAccountDataProvider implements AccountDataProvider {

    @Override
    public List<ProviderAccount> listAccounts(String consentId) {
        return List.of(new ProviderAccount("mock-savings-1", "Mock Bank", "XXXX1234", "SAVINGS"));
    }

    @Override
    public List<ProviderTransaction> fetchTransactions(String consentId, String providerAccountId) {
        return List.of(
                new ProviderTransaction("MOCK-UPI-1", Instant.now(), "UPI-SWIGGY-123456", new BigDecimal("650.00"), "DEBIT", "INR"),
                new ProviderTransaction("MOCK-SALARY-1", Instant.now(), "SALARY CREDIT", new BigDecimal("90000.00"), "CREDIT", "INR")
        );
    }
}
