package com.moneymanager.importdata;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class ImportRepository {

    private final JdbcTemplate jdbcTemplate;

    public ImportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public UUID createBatch(UUID userId, UUID accountId, StatementFileType sourceType, String fileName) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO import_batches (user_id, account_id, source_type, original_file_name, status)
                VALUES (?, ?, ?, ?, 'PREVIEWED')
                RETURNING id
                """, UUID.class, userId, accountId, sourceType.name(), fileName);
    }

    public ImportPreviewRow insertRow(UUID batchId, int rowNumber, Map<String, String> raw, ImportPreviewRow row, String fingerprint) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO import_rows (
                    import_batch_id, row_number, raw_payload, normalized_payload, validation_errors,
                    duplicate_status, suggested_category_id, row_status, fingerprint, parsed_date,
                    parsed_amount, parsed_direction, parsed_description, parsed_merchant, parsed_reference
                )
                VALUES (?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                RETURNING *
                """, this::mapRow,
                batchId,
                rowNumber,
                toJson(raw),
                toJson(Map.of(
                        "description", row.description() == null ? "" : row.description(),
                        "merchant", row.merchant() == null ? "" : row.merchant()
                )),
                toJson(Map.of("errors", row.errors())),
                row.duplicateStatus(),
                row.suggestedCategoryId(),
                row.rowStatus(),
                fingerprint,
                row.occurredAt() == null ? null : Timestamp.from(row.occurredAt()),
                row.amount(),
                row.direction(),
                row.description(),
                row.merchant(),
                row.referenceNumber());
    }

    public UUID batchAccountId(UUID userId, UUID batchId) {
        return jdbcTemplate.queryForObject("""
                SELECT account_id FROM import_batches
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, UUID.class, userId, batchId);
    }

    public List<ImportPreviewRow> rowsForConfirm(UUID userId, UUID batchId, List<UUID> approvedRowIds) {
        return jdbcTemplate.query("""
                SELECT r.*
                FROM import_rows r
                JOIN import_batches b ON b.id = r.import_batch_id
                WHERE b.user_id = ? AND b.id = ? AND r.id = ANY(?)
                  AND r.row_status = 'VALID'
                ORDER BY r.row_number ASC
                """, this::mapRow, userId, batchId, approvedRowIds.toArray(UUID[]::new));
    }

    public void markImported(UUID rowId, UUID transactionId) {
        jdbcTemplate.update("UPDATE import_rows SET transaction_id = ? WHERE id = ?", transactionId, rowId);
    }

    public void completeBatch(UUID batchId, int imported, int duplicates, int failed) {
        jdbcTemplate.update("""
                UPDATE import_batches
                SET status = 'IMPORTED', imported_count = ?, duplicate_count = ?, failed_count = ?, updated_at = now()
                WHERE id = ?
                """, imported, duplicates, failed, batchId);
    }

    public boolean exactDuplicateExists(UUID userId, UUID accountId, String reference, String fingerprint) {
        if (reference != null && !reference.isBlank()) {
            Boolean exists = jdbcTemplate.queryForObject("""
                    SELECT EXISTS (
                        SELECT 1 FROM transactions
                        WHERE user_id = ? AND account_id = ? AND reference_number = ? AND deleted_at IS NULL
                    )
                    """, Boolean.class, userId, accountId, reference);
            if (Boolean.TRUE.equals(exists)) {
                return true;
            }
        }
        Boolean exists = jdbcTemplate.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM transactions
                    WHERE user_id = ? AND account_id = ? AND duplicate_fingerprint = ? AND deleted_at IS NULL
                )
                """, Boolean.class, userId, accountId, fingerprint);
        return Boolean.TRUE.equals(exists);
    }

    private ImportPreviewRow mapRow(ResultSet rs, int rowNum) throws SQLException {
        return new ImportPreviewRow(
                rs.getObject("id", UUID.class),
                rs.getInt("row_number"),
                toInstant(rs.getTimestamp("parsed_date")),
                rs.getString("parsed_description"),
                rs.getBigDecimal("parsed_amount"),
                rs.getString("parsed_direction"),
                rs.getString("parsed_merchant"),
                rs.getString("parsed_reference"),
                rs.getObject("suggested_category_id", UUID.class),
                rs.getString("duplicate_status"),
                rs.getString("row_status"),
                List.of(),
                Map.of()
        );
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }

    private String toJson(Object value) {
        if (value instanceof Map<?, ?> map) {
            StringBuilder builder = new StringBuilder("{");
            int i = 0;
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (i++ > 0) {
                    builder.append(',');
                }
                builder.append('"').append(escape(String.valueOf(entry.getKey()))).append('"').append(':');
                builder.append('"').append(escape(String.valueOf(entry.getValue()))).append('"');
            }
            return builder.append('}').toString();
        }
        return "{}";
    }

    private String escape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
