package com.moneymanager.transaction;

import com.moneymanager.common.ResourceNotFoundException;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class TransactionRepository {

    private final JdbcTemplate jdbcTemplate;

    public TransactionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<TransactionResponse> list(UUID userId, UUID accountId, Instant from, Instant to, int limit, int offset) {
        return jdbcTemplate.query("""
                SELECT * FROM transactions
                WHERE user_id = ?
                  AND deleted_at IS NULL
                  AND (? IS NULL OR account_id = ? OR destination_account_id = ?)
                  AND (? IS NULL OR occurred_at >= ?)
                  AND (? IS NULL OR occurred_at <= ?)
                ORDER BY occurred_at DESC, created_at DESC
                LIMIT ? OFFSET ?
                """, this::mapTransaction,
                userId,
                accountId, accountId, accountId,
                toTimestamp(from), toTimestamp(from),
                toTimestamp(to), toTimestamp(to),
                Math.min(Math.max(limit, 1), 100),
                Math.max(offset, 0));
    }

    public TransactionResponse create(UUID userId, CreateTransactionRequest request, UUID transferGroupId) {
        return create(userId, request, transferGroupId, "MANUAL");
    }

    public TransactionResponse create(UUID userId, CreateTransactionRequest request, UUID transferGroupId, String source) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO transactions (
                    user_id, account_id, destination_account_id, category_id, transfer_group_id,
                    type, direction, amount, currency, merchant, normalized_merchant, occurred_at,
                    payment_method, notes, reference_number, status, source, duplicate_fingerprint
                )
                VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, this::mapTransaction,
                userId,
                request.accountId(),
                request.categoryId(),
                transferGroupId,
                request.type().name(),
                request.direction().name(),
                request.amount(),
                request.currency() == null ? "INR" : request.currency(),
                blankToNull(request.merchant()),
                normalize(request.merchant()),
                Timestamp.from(request.occurredAt()),
                blankToNull(request.paymentMethod()),
                blankToNull(request.notes()),
                blankToNull(request.referenceNumber()),
                request.status() == null ? TransactionStatus.CLEARED.name() : request.status().name(),
                source,
                fingerprintFor(userId, request.accountId(), request.occurredAt(), request.amount(), request.direction(), request.merchant(), request.referenceNumber()));
    }

    public TransactionResponse createTransferLeg(
            UUID userId,
            UUID accountId,
            UUID destinationAccountId,
            UUID transferGroupId,
            TransactionDirection direction,
            BigDecimal amount,
            String currency,
            Instant occurredAt,
            String notes,
            String referenceNumber
    ) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO transactions (
                    user_id, account_id, destination_account_id, transfer_group_id,
                    type, direction, amount, currency, merchant, normalized_merchant, occurred_at,
                    notes, reference_number, status, source, duplicate_fingerprint
                )
                VALUES (?, ?, ?, ?, 'TRANSFER', ?, ?, ?, 'Transfer', 'TRANSFER', ?, ?, ?, 'CLEARED', 'MANUAL', ?)
                RETURNING *
                """, this::mapTransaction,
                userId,
                accountId,
                destinationAccountId,
                transferGroupId,
                direction.name(),
                amount,
                currency,
                Timestamp.from(occurredAt),
                blankToNull(notes),
                blankToNull(referenceNumber),
                fingerprintFor(userId, accountId, occurredAt, amount, direction, "Transfer", referenceNumber));
    }

    public TransactionResponse get(UUID userId, UUID transactionId) {
        return jdbcTemplate.query("""
                SELECT * FROM transactions
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, this::mapTransaction, userId, transactionId).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Transaction was not found"));
    }

    public List<TransactionResponse> getTransferGroup(UUID userId, UUID transferGroupId) {
        return jdbcTemplate.query("""
                SELECT * FROM transactions
                WHERE user_id = ? AND transfer_group_id = ? AND deleted_at IS NULL
                ORDER BY direction DESC
                """, this::mapTransaction, userId, transferGroupId);
    }

    public void softDelete(UUID userId, UUID transactionId, String reason) {
        int updated = jdbcTemplate.update("""
                UPDATE transactions
                SET deleted_at = now(), deleted_reason = ?, version = version + 1, updated_at = now()
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, reason, userId, transactionId);
        if (updated == 0) {
            throw new ResourceNotFoundException("Transaction was not found");
        }
    }

    private TransactionResponse mapTransaction(ResultSet rs, int rowNum) throws SQLException {
        return new TransactionResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("account_id", UUID.class),
                rs.getObject("destination_account_id", UUID.class),
                rs.getObject("category_id", UUID.class),
                rs.getObject("transfer_group_id", UUID.class),
                TransactionType.valueOf(rs.getString("type")),
                TransactionDirection.valueOf(rs.getString("direction")),
                rs.getBigDecimal("amount"),
                rs.getString("currency"),
                rs.getString("merchant"),
                toInstant(rs.getTimestamp("occurred_at")),
                rs.getString("payment_method"),
                rs.getString("notes"),
                rs.getString("reference_number"),
                TransactionStatus.valueOf(rs.getString("status")),
                rs.getString("source"),
                rs.getLong("version"),
                toInstant(rs.getTimestamp("created_at")),
                toInstant(rs.getTimestamp("updated_at"))
        );
    }

    public static String fingerprintFor(UUID userId, UUID accountId, Instant occurredAt, BigDecimal amount, TransactionDirection direction, String merchant, String referenceNumber) {
        String reliableReference = referenceNumber == null ? "" : referenceNumber.trim().toUpperCase();
        return Integer.toHexString((userId + "|" + accountId + "|" + occurredAt + "|" + amount + "|" + direction + "|" + normalizeValue(merchant) + "|" + reliableReference).hashCode());
    }

    private String normalize(String value) {
        return normalizeValue(value);
    }

    private static String normalizeValue(String value) {
        return value == null ? null : value.trim().toUpperCase();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Timestamp toTimestamp(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
