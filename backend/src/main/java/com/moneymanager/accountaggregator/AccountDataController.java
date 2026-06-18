package com.moneymanager.accountaggregator;

import com.moneymanager.common.ApiResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/account-data")
public class AccountDataController {

    private final AccountDataProvider accountDataProvider;

    public AccountDataController(AccountDataProvider accountDataProvider) {
        this.accountDataProvider = accountDataProvider;
    }

    @GetMapping("/accounts")
    ApiResponse<List<ProviderAccount>> accounts(@RequestParam(defaultValue = "mock-consent") String consentId) {
        return ApiResponse.ok(accountDataProvider.listAccounts(consentId));
    }

    @GetMapping("/transactions")
    ApiResponse<List<ProviderTransaction>> transactions(
            @RequestParam(defaultValue = "mock-consent") String consentId,
            @RequestParam String providerAccountId
    ) {
        return ApiResponse.ok(accountDataProvider.fetchTransactions(consentId, providerAccountId));
    }
}
