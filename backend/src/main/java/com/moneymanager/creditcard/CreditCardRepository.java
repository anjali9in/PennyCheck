package com.moneymanager.creditcard;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CreditCardRepository {

    private final JdbcTemplate jdbcTemplate;

    public CreditCardRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CreditCardSummary> summaries(UUID userId) {
        return jdbcTemplate.query("""
                SELECT id, name, currency, current_balance, credit_limit, billing_day, payment_due_day
                FROM accounts
                WHERE user_id = ? AND type = 'CREDIT_CARD' AND deleted_at IS NULL AND archived = FALSE
                ORDER BY name ASC
                """, this::mapSummary, userId);
    }

    private CreditCardSummary mapSummary(ResultSet rs, int rowNum) throws SQLException {
        BigDecimal balance = rs.getBigDecimal("current_balance");
        BigDecimal creditLimit = rs.getBigDecimal("credit_limit") == null ? BigDecimal.ZERO : rs.getBigDecimal("credit_limit");
        BigDecimal used = balance.max(BigDecimal.ZERO);
        BigDecimal available = creditLimit.subtract(used).max(BigDecimal.ZERO);
        BigDecimal utilization = creditLimit.signum() == 0
                ? BigDecimal.ZERO
                : used.multiply(BigDecimal.valueOf(100)).divide(creditLimit, 2, RoundingMode.HALF_UP);
        return new CreditCardSummary(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("currency"),
                balance,
                creditLimit,
                available,
                utilization,
                (Integer) rs.getObject("billing_day"),
                (Integer) rs.getObject("payment_due_day")
        );
    }
}
