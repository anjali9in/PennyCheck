package com.moneymanager.importdata;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class CategorizationService {

    private final JdbcTemplate jdbcTemplate;

    public CategorizationService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CategorizationRuleResponse> list(UUID userId) {
        seedDefaults(userId);
        return jdbcTemplate.query("""
                SELECT id, category_id, match_type, pattern, priority, enabled
                FROM categorization_rules
                WHERE user_id = ? AND deleted_at IS NULL
                ORDER BY priority ASC, created_at ASC
                """, this::mapRule, userId);
    }

    public CategorizationRuleResponse create(UUID userId, CategorizationRuleRequest request) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO categorization_rules (user_id, category_id, match_type, pattern, priority, enabled)
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING id, category_id, match_type, pattern, priority, enabled
                """, this::mapRule, userId, request.categoryId(), request.matchType(), request.pattern().toUpperCase(Locale.ROOT), request.priority(), request.enabled());
    }

    public Optional<UUID> suggestCategory(UUID userId, String narration, String merchant) {
        seedDefaults(userId);
        String haystack = ((merchant == null ? "" : merchant) + " " + (narration == null ? "" : narration)).toUpperCase(Locale.ROOT);
        return jdbcTemplate.query("""
                SELECT category_id, pattern
                FROM categorization_rules
                WHERE user_id = ? AND enabled = TRUE AND deleted_at IS NULL
                ORDER BY priority ASC, created_at ASC
                """, (rs, rowNum) -> new PatternMatch(rs.getObject("category_id", UUID.class), rs.getString("pattern")), userId)
                .stream()
                .filter(rule -> haystack.contains(rule.pattern()))
                .map(PatternMatch::categoryId)
                .findFirst();
    }

    private void seedDefaults(UUID userId) {
        Integer count = jdbcTemplate.queryForObject("SELECT count(*) FROM categorization_rules WHERE user_id = ? AND deleted_at IS NULL",
                Integer.class, userId);
        if (count != null && count > 0) {
            return;
        }
        createDefault(userId, "Food & Dining", "SWIGGY", 10);
        createDefault(userId, "Food & Dining", "ZOMATO", 11);
        createDefault(userId, "Transport", "UBER", 20);
        createDefault(userId, "Transport", "OLA", 21);
        createDefault(userId, "Shopping", "AMAZON", 30);
        createDefault(userId, "Shopping", "FLIPKART", 31);
        createDefault(userId, "Entertainment", "NETFLIX", 40);
        createDefault(userId, "Entertainment", "SPOTIFY", 41);
        createDefault(userId, "Salary Income", "SALARY", 50);
        createDefault(userId, "Utilities", "ELECTRICITY", 60);
        createDefault(userId, "Housing", "RENT", 70);
    }

    private void createDefault(UUID userId, String categoryName, String pattern, int priority) {
        List<UUID> categoryIds = jdbcTemplate.query("""
                SELECT id FROM categories
                WHERE user_id = ? AND name = ? AND deleted_at IS NULL
                LIMIT 1
                """, (rs, rowNum) -> rs.getObject("id", UUID.class), userId, categoryName);
        if (!categoryIds.isEmpty()) {
            jdbcTemplate.update("""
                    INSERT INTO categorization_rules (user_id, category_id, match_type, pattern, priority, enabled)
                    VALUES (?, ?, 'NARRATION_CONTAINS', ?, ?, TRUE)
                    """, userId, categoryIds.getFirst(), pattern, priority);
        }
    }

    private CategorizationRuleResponse mapRule(ResultSet rs, int rowNum) throws SQLException {
        return new CategorizationRuleResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("category_id", UUID.class),
                rs.getString("match_type"),
                rs.getString("pattern"),
                rs.getInt("priority"),
                rs.getBoolean("enabled")
        );
    }

    private record PatternMatch(UUID categoryId, String pattern) {
    }
}
