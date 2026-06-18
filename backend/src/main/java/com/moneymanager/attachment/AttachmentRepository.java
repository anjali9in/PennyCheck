package com.moneymanager.attachment;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AttachmentRepository {

    private final JdbcTemplate jdbcTemplate;

    public AttachmentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public AttachmentResponse create(UUID userId, CreateAttachmentRequest request, String storageKey, String uploadUrl, String downloadUrl) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO attachments (user_id, transaction_id, file_name, content_type, size_bytes, storage_key, sha256_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, (rs, rowNum) -> mapAttachment(rs, uploadUrl, downloadUrl),
                userId,
                request.transactionId(),
                request.fileName().trim(),
                request.contentType(),
                request.sizeBytes(),
                storageKey,
                request.sha256Hash());
    }

    public List<AttachmentResponse> list(UUID userId, UUID transactionId) {
        return jdbcTemplate.query("""
                SELECT * FROM attachments
                WHERE user_id = ? AND (? IS NULL OR transaction_id = ?) AND deleted_at IS NULL
                ORDER BY created_at DESC
                """, (rs, rowNum) -> mapAttachment(rs, null, signedDownloadUrl(rs.getString("storage_key"))),
                userId,
                transactionId,
                transactionId);
    }

    private AttachmentResponse mapAttachment(ResultSet rs, String uploadUrl, String downloadUrl) throws SQLException {
        return new AttachmentResponse(
                rs.getObject("id", UUID.class),
                rs.getObject("transaction_id", UUID.class),
                rs.getString("file_name"),
                rs.getString("content_type"),
                rs.getLong("size_bytes"),
                rs.getString("storage_key"),
                rs.getString("sha256_hash"),
                uploadUrl,
                downloadUrl,
                toInstant(rs.getTimestamp("created_at"))
        );
    }

    private String signedDownloadUrl(String storageKey) {
        return "local-s3://download/" + storageKey;
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
