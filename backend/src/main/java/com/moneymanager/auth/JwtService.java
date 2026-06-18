package com.moneymanager.auth;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {
    };

    private final JwtProperties properties;
    private final ObjectMapper objectMapper;

    public JwtService(JwtProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.objectMapper = objectMapper;
    }

    public String createAccessToken(UUID userId, UUID deviceId, String email) {
        Instant now = Instant.now();
        Map<String, Object> header = Map.of("alg", "HS256", "typ", "JWT");
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("iss", properties.issuer());
        payload.put("sub", userId.toString());
        payload.put("deviceId", deviceId.toString());
        payload.put("email", email);
        payload.put("iat", now.getEpochSecond());
        payload.put("exp", now.plus(properties.accessTokenMinutes(), ChronoUnit.MINUTES).getEpochSecond());

        return encode(header) + "." + encode(payload) + "." + sign(encode(header) + "." + encode(payload));
    }

    public AuthenticatedUser verify(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new InvalidTokenException("Invalid access token");
        }

        String unsigned = parts[0] + "." + parts[1];
        if (!constantTimeEquals(sign(unsigned), parts[2])) {
            throw new InvalidTokenException("Invalid access token signature");
        }

        try {
            Map<String, Object> payload = objectMapper.readValue(BASE64_URL_DECODER.decode(parts[1]), MAP_TYPE);
            if (!properties.issuer().equals(payload.get("iss"))) {
                throw new InvalidTokenException("Invalid token issuer");
            }
            long expiresAt = ((Number) payload.get("exp")).longValue();
            if (Instant.ofEpochSecond(expiresAt).isBefore(Instant.now())) {
                throw new InvalidTokenException("Access token expired");
            }
            return new AuthenticatedUser(
                    UUID.fromString(String.valueOf(payload.get("sub"))),
                    UUID.fromString(String.valueOf(payload.get("deviceId"))),
                    String.valueOf(payload.get("email"))
            );
        } catch (IllegalArgumentException exception) {
            throw new InvalidTokenException("Invalid access token", exception);
        } catch (Exception exception) {
            if (exception instanceof InvalidTokenException invalidTokenException) {
                throw invalidTokenException;
            }
            throw new InvalidTokenException("Invalid access token", exception);
        }
    }

    private String encode(Map<String, Object> value) {
        try {
            return BASE64_URL_ENCODER.encodeToString(objectMapper.writeValueAsBytes(value));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to encode JWT", exception);
        }
    }

    private String sign(String unsignedToken) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(properties.secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return BASE64_URL_ENCODER.encodeToString(mac.doFinal(unsignedToken.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to sign JWT", exception);
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        return MessageDigestAdapter.isEqual(left.getBytes(StandardCharsets.UTF_8), right.getBytes(StandardCharsets.UTF_8));
    }

    private static final class MessageDigestAdapter {
        private static boolean isEqual(byte[] left, byte[] right) {
            return java.security.MessageDigest.isEqual(left, right);
        }
    }
}
