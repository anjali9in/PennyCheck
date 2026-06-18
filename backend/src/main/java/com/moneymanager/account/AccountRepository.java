package com.moneymanager.account;

import com.moneymanager.common.ResourceNotFoundException;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AccountRepository {

    private final JdbcTemplate jdbcTemplate;

    public AccountRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<AccountResponse> list(UUID userId, boolean includeArchived) {
        return jdbcTemplate.query("""
                SELECT * FROM accounts
                WHERE user_id = ? AND deleted_at IS NULL AND (? OR archived = FALSE)
                ORDER BY archived ASC, name ASC
                """, this::mapAccount, userId, includeArchived);
    }

    public Optional<AccountResponse> find(UUID userId, UUID accountId) {
        return jdbcTemplate.query("""
                SELECT * FROM accounts
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, this::mapAccount, userId, accountId).stream().findFirst();
    }

    public AccountResponse get(UUID userId, UUID accountId) {
        return find(userId, accountId)
                .orElseThrow(() -> new ResourceNotFoundException("Account was not found"));
    }

    public AccountResponse create(UUID userId, CreateAccountRequest request) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO accounts (
                    user_id, name, type, institution, last_four_digits, opening_balance, current_balance,
                    currency, credit_limit, billing_day, payment_due_day, include_in_net_worth, icon, color
                )
                VALUES (?, ?, ?, ?, NULLIF(?, ''), ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, this::mapAccount,
                userId,
                request.name().trim(),
                request.type().name(),
                blankToNull(request.institution()),
                request.lastFourDigits() == null ? "" : request.lastFourDigits(),
                request.openingBalance(),
                request.openingBalance(),
                request.currency(),
                request.creditLimit(),
                request.billingDay(),
                request.paymentDueDay(),
                request.includeInNetWorth(),
                blankToNull(request.icon()),
                blankToNull(request.color()));
    }

    public void adjustBalance(UUID userId, UUID accountId, BigDecimal delta) {
        int updated = jdbcTemplate.update("""
                UPDATE accounts
                SET current_balance = current_balance + ?, version = version + 1, updated_at = now()
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL AND archived = FALSE
                """, delta, userId, accountId);
        if (updated == 0) {
            throw new ResourceNotFoundException("Account was not found");
        }
    }

    public void archive(UUID userId, UUID accountId) {
        int updated = jdbcTemplate.update("""
                UPDATE accounts
                SET archived = TRUE, version = version + 1, updated_at = now()
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, userId, accountId);
        if (updated == 0) {
            throw new ResourceNotFoundException("Account was not found");
        }
    }

    private AccountResponse mapAccount(ResultSet rs, int rowNum) throws SQLException {
        return new AccountResponse(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                AccountType.valueOf(rs.getString("type")),
                rs.getString("institution"),
                rs.getString("last_four_digits"),
                rs.getBigDecimal("opening_balance"),
                rs.getBigDecimal("current_balance"),
                rs.getString("currency"),
                rs.getBigDecimal("credit_limit"),
                (Integer) rs.getObject("billing_day"),
                (Integer) rs.getObject("payment_due_day"),
                rs.getBoolean("include_in_net_worth"),
                rs.getString("icon"),
                rs.getString("color"),
                rs.getBoolean("archived"),
                rs.getLong("version"),
                toInstant(rs.getTimestamp("created_at")),
                toInstant(rs.getTimestamp("updated_at"))
        );
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
