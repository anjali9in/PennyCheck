package com.moneymanager.budget;

import com.moneymanager.common.ResourceNotFoundException;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class BudgetRepository {

    private final JdbcTemplate jdbcTemplate;

    public BudgetRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public BudgetResponse create(UUID userId, CreateBudgetRequest request) {
        BudgetResponse budget = jdbcTemplate.queryForObject("""
                INSERT INTO budgets (user_id, name, period_type, start_date, end_date, amount, currency, rollover_enabled, alert_threshold_percent)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, (rs, rowNum) -> mapBudget(rs, List.of(), BigDecimal.ZERO),
                userId,
                request.name().trim(),
                request.periodType().name(),
                Date.valueOf(request.startDate()),
                request.endDate() == null ? null : Date.valueOf(request.endDate()),
                request.amount(),
                request.currency(),
                request.rolloverEnabled(),
                request.alertThresholdPercent() == null ? new BigDecimal("80.00") : request.alertThresholdPercent());
        if (request.categoryIds() != null) {
            for (UUID categoryId : request.categoryIds()) {
                jdbcTemplate.update("INSERT INTO budget_categories (budget_id, category_id) VALUES (?, ?)", budget.id(), categoryId);
            }
        }
        return get(userId, budget.id());
    }

    public List<BudgetResponse> list(UUID userId) {
        return jdbcTemplate.query("""
                SELECT b.* FROM budgets b
                WHERE b.user_id = ? AND b.deleted_at IS NULL
                ORDER BY b.start_date DESC, b.created_at DESC
                """, (rs, rowNum) -> mapBudgetWithComputed(userId, rs), userId);
    }

    public BudgetResponse get(UUID userId, UUID budgetId) {
        return jdbcTemplate.query("""
                SELECT * FROM budgets
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, (rs, rowNum) -> mapBudgetWithComputed(userId, rs), userId, budgetId).stream().findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Budget was not found"));
    }

    public void delete(UUID userId, UUID budgetId) {
        int updated = jdbcTemplate.update("""
                UPDATE budgets SET deleted_at = now(), updated_at = now(), version = version + 1
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, userId, budgetId);
        if (updated == 0) {
            throw new ResourceNotFoundException("Budget was not found");
        }
    }

    private BudgetResponse mapBudgetWithComputed(UUID userId, ResultSet rs) throws SQLException {
        UUID budgetId = rs.getObject("id", UUID.class);
        List<UUID> categoryIds = jdbcTemplate.query(
                "SELECT category_id FROM budget_categories WHERE budget_id = ?",
                (row, rowNum) -> row.getObject("category_id", UUID.class),
                budgetId);
        BigDecimal spent = spent(userId, categoryIds, rs.getDate("start_date"), rs.getDate("end_date"));
        return mapBudget(rs, categoryIds, spent);
    }

    private BigDecimal spent(UUID userId, List<UUID> categoryIds, Date startDate, Date endDate) {
        if (categoryIds.isEmpty()) {
            return BigDecimal.ZERO;
        }
        BigDecimal spent = jdbcTemplate.queryForObject("""
                SELECT COALESCE(SUM(amount), 0)
                FROM transactions
                WHERE user_id = ? AND direction = 'DEBIT' AND status = 'CLEARED' AND deleted_at IS NULL
                  AND category_id = ANY(?)
                  AND occurred_at >= ?
                  AND (? IS NULL OR occurred_at < (?::date + INTERVAL '1 day'))
                """, BigDecimal.class, userId, categoryIds.toArray(UUID[]::new), startDate, endDate, endDate);
        return spent == null ? BigDecimal.ZERO : spent;
    }

    private BudgetResponse mapBudget(ResultSet rs, List<UUID> categoryIds, BigDecimal spent) throws SQLException {
        BigDecimal amount = rs.getBigDecimal("amount");
        return new BudgetResponse(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                BudgetPeriodType.valueOf(rs.getString("period_type")),
                rs.getDate("start_date").toLocalDate(),
                rs.getDate("end_date") == null ? null : rs.getDate("end_date").toLocalDate(),
                amount,
                spent,
                amount.subtract(spent),
                rs.getString("currency"),
                rs.getBoolean("rollover_enabled"),
                rs.getBigDecimal("alert_threshold_percent"),
                categoryIds,
                rs.getLong("version"),
                toInstant(rs.getTimestamp("created_at")),
                toInstant(rs.getTimestamp("updated_at"))
        );
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
