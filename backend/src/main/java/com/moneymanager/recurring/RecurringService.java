package com.moneymanager.recurring;

import com.moneymanager.account.AccountRepository;
import com.moneymanager.auth.AuthenticatedUser;
import com.moneymanager.category.CategoryRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecurringService {

    private final RecurringRepository recurringRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;

    public RecurringService(RecurringRepository recurringRepository, AccountRepository accountRepository, CategoryRepository categoryRepository) {
        this.recurringRepository = recurringRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
    }

    @Transactional
    public RecurringResponse create(AuthenticatedUser user, CreateRecurringRequest request) {
        accountRepository.get(user.userId(), request.accountId());
        if (request.categoryId() != null && !categoryRepository.exists(user.userId(), request.categoryId())) {
            throw new IllegalArgumentException("Category was not found");
        }
        return recurringRepository.create(user.userId(), request);
    }

    @Transactional(readOnly = true)
    public List<RecurringResponse> list(UUID userId) {
        return recurringRepository.list(userId);
    }

    @Transactional
    public void setPaused(UUID userId, UUID recurringId, boolean paused) {
        recurringRepository.setPaused(userId, recurringId, paused);
    }

    @Transactional
    public List<SubscriptionResponse> detectAndListSubscriptions(UUID userId) {
        recurringRepository.detectSubscriptions(userId);
        return recurringRepository.listSubscriptions(userId);
    }
}
