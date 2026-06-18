package com.moneymanager.auth;

import com.moneymanager.auth.dto.DeviceRequest;
import com.moneymanager.user.DeviceResponse;
import com.moneymanager.user.UserProfileResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AuthRepository {

    private final JdbcTemplate jdbcTemplate;

    public AuthRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public UserRecord createUser(String name, String email, String passwordHash) {
        try {
            return jdbcTemplate.queryForObject("""
                    INSERT INTO users (name, email, password_hash)
                    VALUES (?, ?, ?)
                    RETURNING id, name, email, password_hash, email_verified, default_currency, timezone, financial_month_start_day
                    """, this::mapUser, name, email, passwordHash);
        } catch (DataIntegrityViolationException exception) {
            throw new AuthException("EMAIL_ALREADY_REGISTERED", "Email is already registered");
        }
    }

    public Optional<UserRecord> findActiveUserByEmail(String email) {
        return jdbcTemplate.query("""
                SELECT id, name, email, password_hash, email_verified, default_currency, timezone, financial_month_start_day
                FROM users
                WHERE lower(email) = lower(?) AND deleted_at IS NULL
                """, this::mapUser, email).stream().findFirst();
    }

    public Optional<UserRecord> findActiveUserById(UUID userId) {
        return jdbcTemplate.query("""
                SELECT id, name, email, password_hash, email_verified, default_currency, timezone, financial_month_start_day
                FROM users
                WHERE id = ? AND deleted_at IS NULL
                """, this::mapUser, userId).stream().findFirst();
    }

    public UserProfileResponse getProfile(UUID userId) {
        return jdbcTemplate.queryForObject("""
                SELECT id, name, email, email_verified, default_currency, timezone, financial_month_start_day
                FROM users
                WHERE id = ? AND deleted_at IS NULL
                """, (rs, rowNum) -> new UserProfileResponse(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("email"),
                rs.getBoolean("email_verified"),
                rs.getString("default_currency"),
                rs.getString("timezone"),
                rs.getInt("financial_month_start_day")
        ), userId);
    }

    public UUID upsertDevice(UUID userId, DeviceRequest request, String deviceFingerprintHash, String pushTokenHash) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO user_devices (user_id, device_name, platform, device_fingerprint_hash, push_token_hash, last_seen_at, remote_logged_out_at)
                VALUES (?, ?, ?, ?, ?, now(), NULL)
                ON CONFLICT (user_id, device_fingerprint_hash)
                DO UPDATE SET
                    device_name = EXCLUDED.device_name,
                    platform = EXCLUDED.platform,
                    push_token_hash = EXCLUDED.push_token_hash,
                    last_seen_at = now(),
                    remote_logged_out_at = NULL,
                    updated_at = now()
                RETURNING id
                """, UUID.class, userId, request.deviceName(), request.platform(), deviceFingerprintHash, pushTokenHash);
    }

    public void touchDevice(UUID deviceId) {
        jdbcTemplate.update("UPDATE user_devices SET last_seen_at = now(), updated_at = now() WHERE id = ?", deviceId);
    }

    public boolean isDeviceRemoteLoggedOut(UUID userId, UUID deviceId) {
        Boolean value = jdbcTemplate.queryForObject("""
                SELECT remote_logged_out_at IS NOT NULL
                FROM user_devices
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, Boolean.class, userId, deviceId);
        return Boolean.TRUE.equals(value);
    }

    public List<DeviceResponse> listDevices(UUID userId) {
        return jdbcTemplate.query("""
                SELECT id, device_name, platform, last_seen_at, remote_logged_out_at, created_at
                FROM user_devices
                WHERE user_id = ? AND deleted_at IS NULL
                ORDER BY last_seen_at DESC NULLS LAST, created_at DESC
                """, (rs, rowNum) -> new DeviceResponse(
                rs.getObject("id", UUID.class),
                rs.getString("device_name"),
                rs.getString("platform"),
                toInstant(rs.getTimestamp("last_seen_at")),
                toInstant(rs.getTimestamp("remote_logged_out_at")),
                toInstant(rs.getTimestamp("created_at"))
        ), userId);
    }

    public void remoteLogoutDevice(UUID userId, UUID deviceId) {
        int updated = jdbcTemplate.update("""
                UPDATE user_devices
                SET remote_logged_out_at = now(), updated_at = now()
                WHERE user_id = ? AND id = ? AND deleted_at IS NULL
                """, userId, deviceId);
        if (updated == 0) {
            throw new AuthException("DEVICE_NOT_FOUND", "Device was not found");
        }
        jdbcTemplate.update("UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = ? AND device_id = ? AND revoked_at IS NULL",
                userId, deviceId);
    }

    public RefreshTokenRecord createRefreshToken(UUID userId, UUID deviceId, String tokenHash, UUID familyId, Instant expiresAt) {
        return jdbcTemplate.queryForObject("""
                INSERT INTO refresh_tokens (user_id, device_id, token_hash, family_id, expires_at)
                VALUES (?, ?, ?, ?, ?)
                RETURNING id, user_id, device_id, token_hash, family_id, expires_at, revoked_at
                """, this::mapRefreshToken, userId, deviceId, tokenHash, familyId, Timestamp.from(expiresAt));
    }

    public Optional<RefreshTokenRecord> findRefreshToken(String tokenHash) {
        return jdbcTemplate.query("""
                SELECT id, user_id, device_id, token_hash, family_id, expires_at, revoked_at
                FROM refresh_tokens
                WHERE token_hash = ?
                """, this::mapRefreshToken, tokenHash).stream().findFirst();
    }

    public void rotateRefreshToken(UUID oldTokenId, UUID newTokenId) {
        jdbcTemplate.update("UPDATE refresh_tokens SET revoked_at = now(), replaced_by_token_id = ? WHERE id = ?", newTokenId, oldTokenId);
    }

    public void revokeRefreshToken(String tokenHash) {
        jdbcTemplate.update("UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = ? AND revoked_at IS NULL", tokenHash);
    }

    public void createEmailVerificationToken(UUID userId, String tokenHash, Instant expiresAt) {
        jdbcTemplate.update("""
                INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
                VALUES (?, ?, ?)
                """, userId, tokenHash, Timestamp.from(expiresAt));
    }

    public Optional<UUID> consumeEmailVerificationToken(String tokenHash) {
        return jdbcTemplate.query("""
                UPDATE email_verification_tokens
                SET consumed_at = now()
                WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > now()
                RETURNING user_id
                """, (rs, rowNum) -> rs.getObject("user_id", UUID.class), tokenHash).stream().findFirst();
    }

    public void markEmailVerified(UUID userId) {
        jdbcTemplate.update("UPDATE users SET email_verified = TRUE, updated_at = now() WHERE id = ?", userId);
    }

    public void createPasswordResetToken(UUID userId, String tokenHash, Instant expiresAt) {
        jdbcTemplate.update("""
                INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
                VALUES (?, ?, ?)
                """, userId, tokenHash, Timestamp.from(expiresAt));
    }

    public Optional<UUID> consumePasswordResetToken(String tokenHash) {
        return jdbcTemplate.query("""
                UPDATE password_reset_tokens
                SET consumed_at = now()
                WHERE token_hash = ? AND consumed_at IS NULL AND expires_at > now()
                RETURNING user_id
                """, (rs, rowNum) -> rs.getObject("user_id", UUID.class), tokenHash).stream().findFirst();
    }

    public void updatePassword(UUID userId, String passwordHash) {
        jdbcTemplate.update("UPDATE users SET password_hash = ?, updated_at = now() WHERE id = ?", passwordHash, userId);
        jdbcTemplate.update("UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = ? AND revoked_at IS NULL", userId);
    }

    public int countRecentAuthEvents(String subject, String eventType, Instant since) {
        Integer count = jdbcTemplate.queryForObject("""
                SELECT count(*) FROM auth_rate_limit_events
                WHERE subject = ? AND event_type = ? AND created_at >= ?
                """, Integer.class, subject, eventType, Timestamp.from(since));
        return count == null ? 0 : count;
    }

    public void insertAuthEvent(String subject, String eventType, String ipAddress) {
        jdbcTemplate.update("""
                INSERT INTO auth_rate_limit_events (subject, event_type, ip_address)
                VALUES (?, ?, CAST(NULLIF(?, '') AS inet))
                """, subject, eventType, ipAddress == null ? "" : ipAddress);
    }

    private UserRecord mapUser(ResultSet rs, int rowNum) throws SQLException {
        return new UserRecord(
                rs.getObject("id", UUID.class),
                rs.getString("name"),
                rs.getString("email"),
                rs.getString("password_hash"),
                rs.getBoolean("email_verified"),
                rs.getString("default_currency"),
                rs.getString("timezone"),
                rs.getInt("financial_month_start_day")
        );
    }

    private RefreshTokenRecord mapRefreshToken(ResultSet rs, int rowNum) throws SQLException {
        return new RefreshTokenRecord(
                rs.getObject("id", UUID.class),
                rs.getObject("user_id", UUID.class),
                rs.getObject("device_id", UUID.class),
                rs.getString("token_hash"),
                rs.getObject("family_id", UUID.class),
                toInstant(rs.getTimestamp("expires_at")),
                toInstant(rs.getTimestamp("revoked_at"))
        );
    }

    private Instant toInstant(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toInstant();
    }
}
