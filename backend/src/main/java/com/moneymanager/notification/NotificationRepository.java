package com.moneymanager.notification;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class NotificationRepository {

    private final JdbcTemplate jdbcTemplate;

    public NotificationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public NotificationResponse create(UUID userId, CreateNotificationRequest request) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO notifications (user_id, type, title, body, scheduled_at, related_entity_type, related_entity_id, enabled)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, this::mapNotification,
                userId,
                request.type(),
                request.title(),
                request.body(),
                request.scheduledAt() == null ? null : Timestamp.from(request.scheduledAt()),
                request.relatedEntityType(),
                request.relatedEntityId(),
                request.enabled());
    }

    public List<NotificationResponse> list(UUID userId) {
        return jdbcTemplate.query("""
                SELECT * FROM notifications
                WHERE user_id = ? AND deleted_at IS NULL
                ORDER BY scheduled_at ASC NULLS LAST, created_at DESC
                """, this::mapNotification, userId);
    }

    public void markRead(UUID userId, UUID notificationId) {
        jdbcTemplate.update("""
                UPDATE notifications SET read_at = now(), updated_at = now(), version = version + 1
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, userId, notificationId);
    }

    private NotificationResponse mapNotification(ResultSet rs, int rowNum) throws SQLException {
        return new NotificationResponse(
                rs.getObject("id", UUID.class),
                rs.getString("type"),
                rs.getString("title"),
                rs.getString("body"),
                toInstant(rs.getTimestamp("scheduled_at")),
                toInstant(rs.getTimestamp("delivered_at")),
                toInstant(rs.getTimestamp("read_at")),
                rs.getBoolean("enabled")
        );
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
