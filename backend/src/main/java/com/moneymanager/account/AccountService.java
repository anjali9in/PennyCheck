package com.moneymanager.account;

import com.moneymanager.audit.AuditService;
import com.moneymanager.auth.AuthenticatedUser;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AccountService {

    private final AccountRepository accountRepository;
    private final AuditService auditService;

    public AccountService(AccountRepository accountRepository, AuditService auditService) {
        this.accountRepository = accountRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<AccountResponse> list(UUID userId, boolean includeArchived) {
        return accountRepository.list(userId, includeArchived);
    }

    @Transactional(readOnly = true)
    public AccountResponse get(UUID userId, UUID accountId) {
        return accountRepository.get(userId, accountId);
    }

    @Transactional
    public AccountResponse create(AuthenticatedUser user, CreateAccountRequest request) {
        AccountResponse account = accountRepository.create(user.userId(), request);
        auditService.record(user.userId(), user.deviceId(), "ACCOUNT_CREATED", "accounts", account.id(),
                Map.of("openingBalance", account.openingBalance(), "currency", account.currency()));
        return account;
    }

    @Transactional
    public void archive(AuthenticatedUser user, UUID accountId) {
        accountRepository.archive(user.userId(), accountId);
        auditService.record(user.userId(), user.deviceId(), "ACCOUNT_ARCHIVED", "accounts", accountId, Map.of());
    }
}
