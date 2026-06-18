package com.moneymanager.importdata;

import com.moneymanager.account.AccountRepository;
import com.moneymanager.auth.AuthenticatedUser;
import com.moneymanager.category.CategoryRepository;
import com.moneymanager.transaction.CreateTransactionRequest;
import com.moneymanager.transaction.TransactionDirection;
import com.moneymanager.transaction.TransactionRepository;
import com.moneymanager.transaction.TransactionResponse;
import com.moneymanager.transaction.TransactionService;
import com.moneymanager.transaction.TransactionStatus;
import com.moneymanager.transaction.TransactionType;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ImportService {

    private final List<StatementParser> parsers;
    private final ImportNormalizer normalizer;
    private final ImportRepository importRepository;
    private final AccountRepository accountRepository;
    private final CategoryRepository categoryRepository;
    private final CategorizationService categorizationService;
    private final TransactionService transactionService;

    public ImportService(
            List<StatementParser> parsers,
            ImportNormalizer normalizer,
            ImportRepository importRepository,
            AccountRepository accountRepository,
            CategoryRepository categoryRepository,
            CategorizationService categorizationService,
            TransactionService transactionService
    ) {
        this.parsers = parsers;
        this.normalizer = normalizer;
        this.importRepository = importRepository;
        this.accountRepository = accountRepository;
        this.categoryRepository = categoryRepository;
        this.categorizationService = categorizationService;
        this.transactionService = transactionService;
    }

    @Transactional
    public ImportPreviewResponse preview(AuthenticatedUser user, ImportPreviewRequest request) {
        accountRepository.get(user.userId(), request.accountId());
        categoryRepository.ensureDefaultCategories(user.userId());
        ParsedStatement parsed = parserFor(request.fileType()).parse(Base64.getDecoder().decode(request.contentBase64()));
        UUID batchId = importRepository.createBatch(user.userId(), request.accountId(), request.fileType(), request.fileName());

        List<ImportPreviewRow> rows = new ArrayList<>();
        Set<String> seenInBatch = new HashSet<>();
        int valid = 0;
        int duplicate = 0;
        int invalid = 0;

        for (int index = 0; index < parsed.rows().size(); index++) {
            Map<String, String> raw = parsed.rows().get(index);
            ImportPreviewRow previewRow = normalizeRow(user.userId(), request, raw, index + 2, seenInBatch);
            String fingerprint = fingerprint(user.userId(), request.accountId(), previewRow);
            ImportPreviewRow saved = importRepository.insertRow(batchId, index + 2, raw, previewRow, fingerprint);
            ImportPreviewRow responseRow = new ImportPreviewRow(
                    saved.rowId(),
                    previewRow.rowNumber(),
                    previewRow.occurredAt(),
                    previewRow.description(),
                    previewRow.amount(),
                    previewRow.direction(),
                    previewRow.merchant(),
                    previewRow.referenceNumber(),
                    previewRow.suggestedCategoryId(),
                    previewRow.duplicateStatus(),
                    previewRow.rowStatus(),
                    previewRow.errors(),
                    previewRow.raw()
            );
            rows.add(responseRow);
            if ("INVALID".equals(previewRow.rowStatus())) {
                invalid++;
            } else if (!"UNIQUE".equals(previewRow.duplicateStatus())) {
                duplicate++;
            } else {
                valid++;
            }
        }

        return new ImportPreviewResponse(batchId, parsed.headers(), rows, valid, duplicate, invalid);
    }

    @Transactional
    public ImportConfirmResponse confirm(AuthenticatedUser user, UUID batchId, ImportConfirmRequest request) {
        List<UUID> approved = request.approvedRowIds() == null ? List.of() : new ArrayList<>(request.approvedRowIds());
        List<ImportPreviewRow> rows = importRepository.rowsForConfirm(user.userId(), batchId, approved);
        int imported = 0;
        int skipped = approved.size() - rows.size();
        int failed = 0;

        for (ImportPreviewRow row : rows) {
            try {
                TransactionResponse transaction = transactionService.createImported(user, new CreateTransactionRequest(
                        accountIdForBatch(user.userId(), batchId),
                        row.suggestedCategoryId(),
                        "CREDIT".equals(row.direction()) ? TransactionType.INCOME : TransactionType.EXPENSE,
                        TransactionDirection.valueOf(row.direction()),
                        row.amount(),
                        "INR",
                        row.merchant(),
                        row.occurredAt(),
                        null,
                        row.description(),
                        row.referenceNumber(),
                        TransactionStatus.CLEARED
                ));
                importRepository.markImported(row.rowId(), transaction.id());
                imported++;
            } catch (RuntimeException exception) {
                failed++;
            }
        }

        importRepository.completeBatch(batchId, imported, skipped, failed);
        return new ImportConfirmResponse(batchId, imported, skipped, failed);
    }

    private UUID accountIdForBatch(UUID userId, UUID batchId) {
        return importRepository.batchAccountId(userId, batchId);
    }

    private ImportPreviewRow normalizeRow(UUID userId, ImportPreviewRequest request, Map<String, String> raw, int rowNumber, Set<String> seenInBatch) {
        List<String> errors = new ArrayList<>();
        Instant occurredAt = null;
        BigDecimal amount = BigDecimal.ZERO;
        String direction = null;
        String description = value(raw, request.mapping().description());
        String merchant = normalizer.merchantFromNarration(description);
        String reference = value(raw, request.mapping().reference());
        UUID suggestedCategory = categorizationService.suggestCategory(userId, description, merchant).orElse(null);

        try {
            occurredAt = normalizer.parseDate(value(raw, request.mapping().date()), request.dateFormat());
        } catch (RuntimeException exception) {
            errors.add("Invalid date");
        }

        try {
            AmountDirection parsedAmount = amountAndDirection(raw, request.mapping());
            amount = parsedAmount.amount();
            direction = parsedAmount.direction();
            if (amount.compareTo(BigDecimal.ZERO) <= 0) {
                errors.add("Amount must be positive");
            }
        } catch (RuntimeException exception) {
            errors.add("Invalid amount");
        }

        String fingerprint = occurredAt == null || direction == null
                ? "invalid-" + rowNumber
                : TransactionRepository.fingerprintFor(
                userId,
                request.accountId(),
                occurredAt,
                amount,
                TransactionDirection.valueOf(direction),
                merchant,
                reference
        );
        String duplicateStatus = "UNIQUE";
        if (seenInBatch.contains(fingerprint)) {
            duplicateStatus = "EXACT_DUPLICATE";
        } else if (!request.allowDuplicates() && importRepository.exactDuplicateExists(userId, request.accountId(), reference, fingerprint)) {
            duplicateStatus = "EXACT_DUPLICATE";
        }
        seenInBatch.add(fingerprint);

        return new ImportPreviewRow(
                null,
                rowNumber,
                occurredAt,
                description,
                amount,
                direction,
                merchant,
                reference,
                suggestedCategory,
                duplicateStatus,
                errors.isEmpty() ? "VALID" : "INVALID",
                errors,
                raw
        );
    }

    private AmountDirection amountAndDirection(Map<String, String> raw, ImportColumnMapping mapping) {
        BigDecimal debit = normalizer.parseAmount(value(raw, mapping.debit()));
        BigDecimal credit = normalizer.parseAmount(value(raw, mapping.credit()));
        if (debit.compareTo(BigDecimal.ZERO) > 0) {
            return new AmountDirection(debit.abs(), "DEBIT");
        }
        if (credit.compareTo(BigDecimal.ZERO) > 0) {
            return new AmountDirection(credit.abs(), "CREDIT");
        }

        BigDecimal amount = normalizer.parseAmount(value(raw, mapping.amount()));
        String indicator = value(raw, mapping.direction()).toUpperCase(Locale.ROOT);
        if (indicator.contains("CR") || indicator.contains("CREDIT")) {
            return new AmountDirection(amount.abs(), "CREDIT");
        }
        if (indicator.contains("DR") || indicator.contains("DEBIT")) {
            return new AmountDirection(amount.abs(), "DEBIT");
        }
        return new AmountDirection(amount.abs(), amount.signum() < 0 ? "DEBIT" : "CREDIT");
    }

    private String fingerprint(UUID userId, UUID accountId, ImportPreviewRow row) {
        if (row.occurredAt() == null || row.direction() == null) {
            return "invalid-" + row.rowNumber();
        }
        return TransactionRepository.fingerprintFor(
                userId,
                accountId,
                row.occurredAt(),
                row.amount(),
                TransactionDirection.valueOf(row.direction()),
                row.merchant(),
                row.referenceNumber()
        );
    }

    private StatementParser parserFor(StatementFileType fileType) {
        return parsers.stream()
                .filter(parser -> parser.supports(fileType))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported import file type"));
    }

    private String value(Map<String, String> row, String column) {
        if (column == null || column.isBlank()) {
            return "";
        }
        return row.getOrDefault(column, "");
    }

    private record AmountDirection(BigDecimal amount, String direction) {
    }
}
