package com.moneymanager.audit;

import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

    private final JdbcTemplate jdbcTemplate;

    public AuditService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void record(UUID userId, UUID deviceId, String action, String entityType, UUID entityId, Map<String, ?> metadata) {
        jdbcTemplate.update("""
                INSERT INTO audit_logs (user_id, actor_device_id, action, entity_type, entity_id, metadata)
                VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
                """, userId, deviceId, action, entityType, entityId, toJson(metadata));
    }

    private String toJson(Map<String, ?> metadata) {
        if (metadata == null || metadata.isEmpty()) {
            return "{}";
        }
        StringBuilder builder = new StringBuilder("{");
        int index = 0;
        for (Map.Entry<String, ?> entry : metadata.entrySet()) {
            if (index++ > 0) {
                builder.append(',');
            }
            builder.append('"').append(escape(entry.getKey())).append('"').append(':');
            Object value = entry.getValue();
            if (value instanceof Number || value instanceof Boolean) {
                builder.append(value);
            } else {
                builder.append('"').append(escape(String.valueOf(value))).append('"');
            }
        }
        return builder.append('}').toString();
    }

    private String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
