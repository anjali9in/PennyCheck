package com.moneymanager.category;

import com.moneymanager.common.ResourceNotFoundException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CategoryRepository {

    private final JdbcTemplate jdbcTemplate;

    public CategoryRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<CategoryResponse> list(UUID userId, CategoryType type) {
        if (type == null) {
            return jdbcTemplate.query("""
                    SELECT * FROM categories
                    WHERE user_id = ? AND deleted_at IS NULL AND archived = FALSE
                    ORDER BY type ASC, name ASC
                    """, this::mapCategory, userId);
        }
        return jdbcTemplate.query("""
                SELECT * FROM categories
                WHERE user_id = ? AND type = ? AND deleted_at IS NULL AND archived = FALSE
                ORDER BY name ASC
                """, this::mapCategory, userId, type.name());
    }

    public CategoryResponse create(UUID userId, CreateCategoryRequest request, boolean systemCategory) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO categories (user_id, parent_id, name, type, icon, color, system_category)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, this::mapCategory,
                userId,
                request.parentId(),
                request.name().trim(),
                request.type().name(),
                blankToNull(request.icon()),
                blankToNull(request.color()),
                systemCategory);
    }

    public void ensureDefaultCategories(UUID userId) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM categories WHERE user_id = ? AND deleted_at IS NULL
                """, Integer.class, userId);
        if (count != null && count > 0) {
            return;
        }
        createDefault(userId, "Salary Income", CategoryType.INCOME, "cash", "#4B7F52");
        createDefault(userId, "Food & Dining", CategoryType.EXPENSE, "food", "#B8770A");
        createDefault(userId, "Transport", CategoryType.EXPENSE, "car", "#176B87");
        createDefault(userId, "Shopping", CategoryType.EXPENSE, "shopping", "#7B5BA7");
        createDefault(userId, "Entertainment", CategoryType.EXPENSE, "play", "#9D4EDD");
        createDefault(userId, "Utilities", CategoryType.EXPENSE, "flash", "#C2410C");
        createDefault(userId, "Housing", CategoryType.EXPENSE, "home", "#6B7280");
        createDefault(userId, "Transfer", CategoryType.TRANSFER, "swap", "#176B87");
        createDefault(userId, "Investment", CategoryType.INVESTMENT, "chart", "#4B7F52");
        createDefault(userId, "Loan Payment", CategoryType.LOAN, "bank", "#B3261E");
    }

    public void archive(UUID userId, UUID categoryId) {
        int updated = jdbcTemplate.update("""
                UPDATE categories
                SET archived = TRUE, version = version + 1, updated_at = now()
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL AND system_category = FALSE
                """, userId, categoryId);
        if (updated == 0) {
            throw new ResourceNotFoundException("Category was not found or cannot be archived");
        }
    }

    public boolean exists(UUID userId, UUID categoryId) {
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM categories
                    WHERE user_id = ? AND id = ? AND deleted_at IS NULL AND archived = FALSE
                )
                """, Boolean.class, userId, categoryId);
        return Boolean.TRUE.equals(exists);
    }

    private void createDefault(UUID userId, String name, CategoryType type, String icon, String color) {
        create(userId, new CreateCategoryRequest(null, name, type, icon, color), true);
    }

    private CategoryResponse mapCategory(ResultSet rs, int rowNum) throws SQLException {
        return new CategoryResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("parent_id", UUID.class),
                rs.getString("name"),
                CategoryType.valueOf(rs.getString("type")),
                rs.getString("icon"),
                rs.getString("color"),
                rs.getBoolean("system_category"),
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
