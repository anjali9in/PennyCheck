package com.moneymanager.account;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping
    ApiResponse<List<AccountResponse>> list(@RequestParam(defaultValue = "false") boolean includeArchived) {
        return ApiResponse.ok(accountService.list(CurrentUser.userId(), includeArchived));
    }

    @GetMapping("/{accountId}")
    ApiResponse<AccountResponse> get(@PathVariable UUID accountId) {
        return ApiResponse.ok(accountService.get(CurrentUser.userId(), accountId));
    }

    @PostMapping
    ApiResponse<AccountResponse> create(@Valid @RequestBody CreateAccountRequest request) {
        return ApiResponse.ok(accountService.create(CurrentUser.get(), request));
    }

    @DeleteMapping("/{accountId}")
    ApiResponse<Void> archive(@PathVariable UUID accountId) {
        accountService.archive(CurrentUser.get(), accountId);
        return ApiResponse.ok(null);
    }
}
