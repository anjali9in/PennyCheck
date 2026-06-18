package com.moneymanager.sync;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
public class SyncRepository {

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public SyncRepository(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    public Optional<SyncChangeResponse> findExisting(UUID userId, UUID deviceId, String clientChangeId) {
        return jdbcTemplate.query("""
                SELECT * FROM sync_change_log
                WHERE user_id = ? AND device_id IS NOT DISTINCT FROM ? AND client_change_id = ?
                """, this::mapChange, userId, deviceId, clientChangeId).stream().findFirst();
    }

    public Long latestServerVersion(UUID userId, String entityType, String entityId) {
        return jdbcTemplate.queryForObject("""
                SELECT max(server_version)
                FROM sync_change_log
                WHERE user_id = ? AND entity_type = ? AND client_entity_id = ?
                """, Long.class, userId, entityType, entityId);
    }

    public SyncChangeResponse insert(UUID userId, UUID deviceId, SyncChangeRequest request, String status, String conflictReason) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO sync_change_log (
                    user_id, device_id, client_change_id, entity_type, client_entity_id,
                    operation, payload, base_version, status, conflict_reason
                )
                VALUES (?, ?, ?, ?, ?, ?, CAST(? AS jsonb), ?, ?, ?)
                RETURNING *
                """, this::mapChange,
                userId,
                deviceId,
                request.clientChangeId(),
                request.entityType(),
                request.entityId(),
                request.operation().name(),
                request.payload().toString(),
                request.baseVersion(),
                status,
                conflictReason);
    }

    public List<SyncChangeResponse> pull(UUID userId, UUID currentDeviceId, long afterCursor, int limit) {
        return jdbcTemplate.query("""
                SELECT * FROM sync_change_log
                WHERE user_id = ?
                  AND server_version > ?
                  AND status = 'APPLIED'
                  AND device_id IS DISTINCT FROM ?
                ORDER BY server_version ASC
                LIMIT ?
                """, this::mapChange, userId, afterCursor, currentDeviceId, Math.min(Math.max(limit, 1), 500));
    }

    public long cursor(UUID userId) {
        Long cursor = jdbcTemplate.queryForObject("""
                SELECT COALESCE(max(server_version), 0)
                FROM sync_change_log
                WHERE user_id = ?
                """, Long.class, userId);
        return cursor == null ? 0 : cursor;
    }

    private SyncChangeResponse mapChange(ResultSet rs, int rowNum) throws SQLException {
        try {
            JsonNode payload = objectMapper.readTree(rs.getString("payload"));
            return new SyncChangeResponse(
                    rs.getObject("id", UUID.class),
                    rs.getString("client_change_id"),
                    rs.getString("entity_type"),
                    rs.getString("client_entity_id"),
                    SyncOperation.valueOf(rs.getString("operation")),
                    payload,
                    (Long) rs.getObject("base_version"),
                    rs.getLong("server_version"),
                    rs.getString("status"),
                    rs.getString("conflict_reason"),
                    toInstant(rs.getTimestamp("created_at"))
            );
        } catch (Exception exception) {
            throw new SQLException("Unable to parse sync payload", exception);
        }
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
