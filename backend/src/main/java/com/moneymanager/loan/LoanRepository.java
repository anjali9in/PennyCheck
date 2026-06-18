package com.moneymanager.loan;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class LoanRepository {

    private final JdbcTemplate jdbcTemplate;

    public LoanRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<LoanResponse> list(UUID userId) {
        return jdbcTemplate.query("""
                SELECT * FROM loans
                WHERE user_id = ? AND deleted_at IS NULL
                ORDER BY start_date DESC, created_at DESC
                """, this::mapLoan, userId);
    }

    public LoanResponse create(UUID userId, CreateLoanRequest request, EmiCalculationResponse calculation) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO loans (
                    user_id, account_id, name, principal, annual_interest_rate, tenure_months,
                    emi_amount, outstanding_principal, start_date
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, this::mapLoan,
                userId,
                request.accountId(),
                request.name().trim(),
                request.principal(),
                request.annualInterestRate(),
                request.tenureMonths(),
                calculation.emiAmount(),
                request.principal(),
                request.startDate());
    }

    private LoanResponse mapLoan(ResultSet rs, int rowNum) throws SQLException {
        return new LoanResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("account_id", UUID.class),
                rs.getString("name"),
                rs.getBigDecimal("principal"),
                rs.getBigDecimal("annual_interest_rate"),
                rs.getInt("tenure_months"),
                rs.getBigDecimal("emi_amount"),
                rs.getBigDecimal("outstanding_principal"),
                rs.getDate("start_date").toLocalDate(),
                rs.getLong("version"),
                toInstant(rs.getTimestamp("created_at")),
                toInstant(rs.getTimestamp("updated_at"))
        );
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
