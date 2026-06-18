package com.moneymanager.transaction;

import com.moneymanager.account.AccountRepository;
import com.moneymanager.audit.AuditService;
import com.moneymanager.auth.AuthenticatedUser;
import com.moneymanager.category.CategoryRepository;
import com.moneymanager.common.ResourceNotFoundException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final AuditService auditService;

    public TransactionService(
            TransactionRepository transactionRepository,
            AccountRepository accountRepository,
            CategoryRepository categoryRepository,
            AuditService auditService
    ) {
        this.transactionRepository = transactionRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<TransactionResponse> list(UUID userId, UUID accountId, Instant from, Instant to, int limit, int offset) {
        return transactionRepository.list(userId, accountId, from, to, limit, offset);
    }

    @Transactional
    public TransactionResponse create(AuthenticatedUser user, CreateTransactionRequest request) {
        return createWithSource(user, request, "MANUAL");
    }

    @Transactional
    public TransactionResponse createImported(AuthenticatedUser user, CreateTransactionRequest request) {
        return createWithSource(user, request, "STATEMENT");
    }

    private TransactionResponse createWithSource(AuthenticatedUser user, CreateTransactionRequest request, String source) {
        accountRepository.get(user.userId(), request.accountId());
        if (request.categoryId() != null && !categoryRepository.exists(user.userId(), request.categoryId())) {
            throw new ResourceNotFoundException("Category was not found");
        }
        if (request.type() == TransactionType.TRANSFER) {
            throw new IllegalArgumentException("Use the transfer endpoint for transfers");
        }

        TransactionResponse transaction = transactionRepository.create(user.userId(), request, null, source);
        if (transaction.status() == TransactionStatus.CLEARED) {
            accountRepository.adjustBalance(user.userId(), transaction.accountId(), balanceDelta(transaction));
        }
        auditService.record(user.userId(), user.deviceId(), "TRANSACTION_CREATED", "transactions", transaction.id(),
                Map.of("amount", transaction.amount(), "direction", transaction.direction().name()));
        return transaction;
    }

    @Transactional
    public TransferResponse transfer(AuthenticatedUser user, CreateTransferRequest request) {
        if (request.sourceAccountId().equals(request.destinationAccountId())) {
            throw new IllegalArgumentException("Source and destination accounts must be different");
        }
        accountRepository.get(user.userId(), request.sourceAccountId());
        accountRepository.get(user.userId(), request.destinationAccountId());

        UUID transferGroupId = UUID.randomUUID();
        String currency = request.currency() == null ? "INR" : request.currency();
        TransactionResponse debit = transactionRepository.createTransferLeg(
                user.userId(),
                request.sourceAccountId(),
                request.destinationAccountId(),
                transferGroupId,
                TransactionDirection.DEBIT,
                request.amount(),
                currency,
                request.occurredAt(),
                request.notes(),
                request.referenceNumber()
        );
        TransactionResponse credit = transactionRepository.createTransferLeg(
                user.userId(),
                request.destinationAccountId(),
                request.sourceAccountId(),
                transferGroupId,
                TransactionDirection.CREDIT,
                request.amount(),
                currency,
                request.occurredAt(),
                request.notes(),
                request.referenceNumber()
        );

        accountRepository.adjustBalance(user.userId(), request.sourceAccountId(), request.amount().negate());
        accountRepository.adjustBalance(user.userId(), request.destinationAccountId(), request.amount());
        auditService.record(user.userId(), user.deviceId(), "TRANSFER_CREATED", "transactions", transferGroupId,
                Map.of("amount", request.amount(), "sourceAccountId", request.sourceAccountId(), "destinationAccountId", request.destinationAccountId()));
        return new TransferResponse(debit, credit);
    }

    @Transactional
    public void delete(AuthenticatedUser user, UUID transactionId) {
        TransactionResponse transaction = transactionRepository.get(user.userId(), transactionId);
        if (transaction.transferGroupId() != null) {
            List<TransactionResponse> legs = transactionRepository.getTransferGroup(user.userId(), transaction.transferGroupId());
            for (TransactionResponse leg : legs) {
                reverseBalance(user.userId(), leg);
                transactionRepository.softDelete(user.userId(), leg.id(), "transfer_deleted");
            }
            auditService.record(user.userId(), user.deviceId(), "TRANSFER_DELETED", "transactions", transaction.transferGroupId(), Map.of());
            return;
        }

        reverseBalance(user.userId(), transaction);
        transactionRepository.softDelete(user.userId(), transaction.id(), "transaction_deleted");
        auditService.record(user.userId(), user.deviceId(), "TRANSACTION_DELETED", "transactions", transaction.id(), Map.of());
    }

    private void reverseBalance(UUID userId, TransactionResponse transaction) {
        if (transaction.status() == TransactionStatus.CLEARED) {
            accountRepository.adjustBalance(userId, transaction.accountId(), balanceDelta(transaction).negate());
        }
    }

    private BigDecimal balanceDelta(TransactionResponse transaction) {
        return transaction.direction() == TransactionDirection.CREDIT
                ? transaction.amount()
                : transaction.amount().negate();
    }
}
