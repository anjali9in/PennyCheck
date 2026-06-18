package com.moneymanager.investment;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class InvestmentRepository {

    private final JdbcTemplate jdbcTemplate;

    public InvestmentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<InvestmentResponse> list(UUID userId) {
        return jdbcTemplate.query("""
                SELECT * FROM investments
                WHERE user_id = ? AND deleted_at IS NULL
                ORDER BY current_value DESC, name ASC
                """, this::mapInvestment, userId);
    }

    public InvestmentResponse create(UUID userId, CreateInvestmentRequest request) {
        LocalDate valuationDate = request.lastValuationDate() == null ? LocalDate.now() : request.lastValuationDate();
        InvestmentResponse created = jdbcTemplate.queryForObject("""
                INSERT INTO investments (
                    user_id, linked_account_id, name, type, invested_amount, current_value, currency, last_valuation_date
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, this::mapInvestment,
                userId,
                request.linkedAccountId(),
                request.name().trim(),
                request.type().name(),
                request.investedAmount(),
                request.currentValue(),
                request.currency(),
                valuationDate);
        jdbcTemplate.update("""
                INSERT INTO investment_valuations (investment_id, value, valuation_date, source)
                VALUES (?, ?, ?, 'MANUAL')
                """, created.id(), created.currentValue(), valuationDate);
        return created;
    }

    private InvestmentResponse mapInvestment(ResultSet rs, int rowNum) throws SQLException {
        BigDecimal invested = rs.getBigDecimal("invested_amount");
        BigDecimal current = rs.getBigDecimal("current_value");
        BigDecimal gainLoss = current.subtract(invested);
        BigDecimal gainLossPercent = invested.signum() == 0
                ? BigDecimal.ZERO
                : gainLoss.multiply(BigDecimal.valueOf(100)).divide(invested, 2, RoundingMode.HALF_UP);
        return new InvestmentResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("linked_account_id", UUID.class),
                rs.getString("name"),
                InvestmentType.valueOf(rs.getString("type")),
                invested,
                current,
                gainLoss,
                gainLossPercent,
                rs.getString("currency"),
                rs.getDate("last_valuation_date") == null ? null : rs.getDate("last_valuation_date").toLocalDate(),
                rs.getLong("version"),
                toInstant(rs.getTimestamp("created_at")),
                toInstant(rs.getTimestamp("updated_at"))
        );
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
