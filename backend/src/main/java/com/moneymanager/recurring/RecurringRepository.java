package com.moneymanager.recurring;

import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class RecurringRepository {

    private final JdbcTemplate jdbcTemplate;

    public RecurringRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public RecurringResponse create(UUID userId, CreateRecurringRequest request) {
        Instant nextOccurrence = request.startDate().atStartOfDay().toInstant(ZoneOffset.UTC);
        return jdbcTemplate.queryForObject("""
                INSERT INTO recurring_transactions (
                    user_id, account_id, category_id, name, amount, currency, frequency, rrule,
                    start_date, end_date, next_occurrence_at, auto_create
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, this::mapRecurring,
                userId,
                request.accountId(),
                request.categoryId(),
                request.name().trim(),
                request.amount(),
                request.currency(),
                request.frequency().name(),
                request.rrule(),
                Date.valueOf(request.startDate()),
                request.endDate() == null ? null : Date.valueOf(request.endDate()),
                Timestamp.from(nextOccurrence),
                request.autoCreate());
    }

    public List<RecurringResponse> list(UUID userId) {
        return jdbcTemplate.query("""
                SELECT * FROM recurring_transactions
                WHERE user_id = ? AND deleted_at IS NULL
                ORDER BY paused ASC, next_occurrence_at ASC NULLS LAST
                """, this::mapRecurring, userId);
    }

    public void setPaused(UUID userId, UUID recurringId, boolean paused) {
        jdbcTemplate.update("""
                UPDATE recurring_transactions
                SET paused = ?, updated_at = now(), version = version + 1
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, paused, userId, recurringId);
    }

    public List<SubscriptionResponse> listSubscriptions(UUID userId) {
        return jdbcTemplate.query("""
                SELECT id, merchant, amount, currency, billing_frequency, last_charged_at, price_increase_detected
                FROM subscriptions
                WHERE user_id = ? AND deleted_at IS NULL
                ORDER BY merchant ASC
                """, this::mapSubscription, userId);
    }

    public int detectSubscriptions(UUID userId) {
        List<SubscriptionCandidate> candidates = jdbcTemplate.query("""
                SELECT merchant, ROUND(AVG(amount), 2) AS amount, currency, MAX(occurred_at) AS last_charged_at, COUNT(*) AS count
                FROM transactions
                WHERE user_id = ? AND direction = 'DEBIT' AND deleted_at IS NULL AND merchant IS NOT NULL
                GROUP BY merchant, currency
                HAVING COUNT(*) >= 2
                """, (rs, rowNum) -> new SubscriptionCandidate(
                rs.getString("merchant"),
                rs.getBigDecimal("amount"),
                rs.getString("currency"),
                rs.getTimestamp("last_charged_at").toInstant()
        ), userId);
        int inserted = 0;
        for (SubscriptionCandidate candidate : candidates) {
            int updated = jdbcTemplate.update("""
                    INSERT INTO subscriptions (user_id, merchant, amount, currency, billing_frequency, last_charged_at)
                    VALUES (?, ?, ?, ?, 'MONTHLY', ?)
                    ON CONFLICT DO NOTHING
                    """, userId, candidate.merchant(), candidate.amount(), candidate.currency(), Timestamp.from(candidate.lastChargedAt()));
            inserted += updated;
        }
        return inserted;
    }

    private RecurringResponse mapRecurring(ResultSet rs, int rowNum) throws SQLException {
        return new RecurringResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("account_id", UUID.class),
                rs.getObject("category_id", UUID.class),
                rs.getString("name"),
                rs.getBigDecimal("amount"),
                rs.getString("currency"),
                RecurringFrequency.valueOf(rs.getString("frequency")),
                rs.getString("rrule"),
                rs.getDate("start_date").toLocalDate(),
                rs.getDate("end_date") == null ? null : rs.getDate("end_date").toLocalDate(),
                rs.getTimestamp("next_occurrence_at") == null ? null : rs.getTimestamp("next_occurrence_at").toInstant(),
                rs.getBoolean("auto_create"),
                rs.getBoolean("paused")
        );
    }

    private SubscriptionResponse mapSubscription(ResultSet rs, int rowNum) throws SQLException {
        return new SubscriptionResponse(
                rs.getObject("id", UUID.class),
                rs.getString("merchant"),
                rs.getBigDecimal("amount"),
                rs.getString("currency"),
                rs.getString("billing_frequency"),
                rs.getTimestamp("last_charged_at") == null ? null : rs.getTimestamp("last_charged_at").toInstant(),
                rs.getBoolean("price_increase_detected")
        );
    }

    private record SubscriptionCandidate(String merchant, java.math.BigDecimal amount, String currency, Instant lastChargedAt) {
    }
}
