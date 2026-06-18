package com.moneymanager.reports;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ReportRepository {

    private final JdbcTemplate jdbcTemplate;

    public ReportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public MonthlyCashflowResponse currentMonthCashflow(UUID userId) {
        YearMonth month = YearMonth.now();
        LocalDate from = month.atDay(1);
        LocalDate to = month.plusMonths(1).atDay(1);
        return jdbcTemplate.queryForObject("""
                SELECT
                    COALESCE(SUM(CASE WHEN direction = 'CREDIT' AND type <> 'TRANSFER' THEN amount ELSE 0 END), 0) AS income,
                    COALESCE(SUM(CASE WHEN direction = 'DEBIT' AND type <> 'TRANSFER' THEN amount ELSE 0 END), 0) AS expenses
                FROM transactions
                WHERE user_id = ? AND deleted_at IS NULL AND occurred_at >= ? AND occurred_at < ?
                """, (rs, rowNum) -> {
                    BigDecimal income = rs.getBigDecimal("income");
                    BigDecimal expenses = rs.getBigDecimal("expenses");
                    return new MonthlyCashflowResponse(month, income, expenses, income.subtract(expenses));
                }, userId, Date.valueOf(from), Date.valueOf(to));
    }

    public NetWorthResponse netWorth(UUID userId) {
        BigDecimal accounts = sum("""
                SELECT COALESCE(SUM(current_balance), 0)
                FROM accounts
                WHERE user_id = ? AND include_in_net_worth = TRUE AND deleted_at IS NULL
                  AND type NOT IN ('CREDIT_CARD','LOAN','INVESTMENT')
                """, userId);
        BigDecimal creditCards = sum("""
                SELECT COALESCE(SUM(GREATEST(current_balance, 0)), 0)
                FROM accounts
                WHERE user_id = ? AND type = 'CREDIT_CARD' AND deleted_at IS NULL
                """, userId);
        BigDecimal loans = sum("""
                SELECT COALESCE(SUM(outstanding_principal), 0)
                FROM loans
                WHERE user_id = ? AND deleted_at IS NULL
                """, userId);
        BigDecimal investments = sum("""
                SELECT COALESCE(SUM(current_value), 0)
                FROM investments
                WHERE user_id = ? AND deleted_at IS NULL
                """, userId);
        BigDecimal liabilities = creditCards.add(loans);
        return new NetWorthResponse(accounts, investments, liabilities, accounts.add(investments).subtract(liabilities));
    }

    public List<CategorySpendResponse> topExpenseCategories(UUID userId) {
        return jdbcTemplate.query("""
                SELECT c.id AS category_id, COALESCE(c.name, 'Uncategorized') AS category_name, SUM(t.amount) AS amount
                FROM transactions t
                LEFT JOIN categories c ON c.id = t.category_id
                WHERE t.user_id = ? AND t.deleted_at IS NULL AND t.direction = 'DEBIT' AND t.type <> 'TRANSFER'
                GROUP BY c.id, c.name
                ORDER BY amount DESC
                LIMIT 8
                """, (rs, rowNum) -> new CategorySpendResponse(
                rs.getObject("category_id", UUID.class),
                rs.getString("category_name"),
                rs.getBigDecimal("amount")
        ), userId);
    }

    private BigDecimal sum(String sql, UUID userId) {
        BigDecimal value = jdbcTemplate.queryForObject(sql, BigDecimal.class, userId);
        return value == null ? BigDecimal.ZERO : value;
    }
}
