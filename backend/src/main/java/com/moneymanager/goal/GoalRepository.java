package com.moneymanager.goal;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class GoalRepository {

    private final JdbcTemplate jdbcTemplate;

    public GoalRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<GoalResponse> list(UUID userId) {
        return jdbcTemplate.query("""
                SELECT * FROM goals
                WHERE user_id = ? AND deleted_at IS NULL
                ORDER BY target_date NULLS LAST, created_at DESC
                """, this::mapGoal, userId);
    }

    public GoalResponse create(UUID userId, CreateGoalRequest request) {
        BigDecimal currentAmount = request.currentAmount() == null ? BigDecimal.ZERO : request.currentAmount();
        return jdbcTemplate.queryForObject("""
                INSERT INTO goals (
                    user_id, linked_account_id, name, type, target_amount, current_amount, currency, target_date
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, this::mapGoal,
                userId,
                request.linkedAccountId(),
                request.name().trim(),
                request.type().name(),
                request.targetAmount(),
                currentAmount,
                request.currency(),
                request.targetDate());
    }

    private GoalResponse mapGoal(ResultSet rs, int rowNum) throws SQLException {
        BigDecimal target = rs.getBigDecimal("target_amount");
        BigDecimal current = rs.getBigDecimal("current_amount");
        LocalDate targetDate = rs.getDate("target_date") == null ? null : rs.getDate("target_date").toLocalDate();
        BigDecimal progress = target.signum() == 0
                ? BigDecimal.ZERO
                : current.multiply(BigDecimal.valueOf(100)).divide(target, 2, RoundingMode.HALF_UP).min(BigDecimal.valueOf(100));
        BigDecimal remaining = target.subtract(current).max(BigDecimal.ZERO);
        long months = targetDate == null ? 1 : Math.max(1, ChronoUnit.MONTHS.between(LocalDate.now(), targetDate) + 1);
        BigDecimal monthly = remaining.divide(BigDecimal.valueOf(months), 2, RoundingMode.HALF_UP);

        return new GoalResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("linked_account_id", UUID.class),
                rs.getString("name"),
                GoalType.valueOf(rs.getString("type")),
                target,
                current,
                rs.getString("currency"),
                targetDate,
                progress,
                monthly,
                rs.getLong("version"),
                toInstant(rs.getTimestamp("created_at")),
                toInstant(rs.getTimestamp("updated_at"))
        );
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
