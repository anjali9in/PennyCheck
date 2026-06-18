package com.moneymanager.exportdata;

import java.sql.Timestamp;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ExportRepository {

    private final JdbcTemplate jdbcTemplate;

    public ExportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<ExportTransactionRow> transactions(UUID userId) {
        return jdbcTemplate.query("""
                SELECT t.occurred_at, a.name AS account_name, c.name AS category_name, t.type, t.direction,
                       t.amount, t.currency, t.merchant, t.reference_number, t.notes
                FROM transactions t
                JOIN accounts a ON a.id = t.account_id
                LEFT JOIN categories c ON c.id = t.category_id
                WHERE t.user_id = ? AND t.deleted_at IS NULL
                ORDER BY t.occurred_at DESC, t.created_at DESC
                """, (rs, rowNum) -> new ExportTransactionRow(
                rs.getTimestamp("occurred_at").toInstant(),
                rs.getString("account_name"),
                rs.getString("category_name"),
                rs.getString("type"),
                rs.getString("direction"),
                rs.getBigDecimal("amount"),
                rs.getString("currency"),
                rs.getString("merchant"),
                rs.getString("reference_number"),
                rs.getString("notes")
        ), userId);
    }
}
