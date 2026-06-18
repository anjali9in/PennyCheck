package com.moneymanager.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class JwtServiceTest {

    private final JwtService jwtService = new JwtService(
            new JwtProperties("pennycheck-test", "test-secret-with-enough-length", 15, 30),
            new ObjectMapper()
    );

    @Test
    void createsAndVerifiesAccessToken() {
        UUID userId = UUID.randomUUID();
        UUID deviceId = UUID.randomUUID();

        String token = jwtService.createAccessToken(userId, deviceId, "user@example.com");

        AuthenticatedUser user = jwtService.verify(token);

        assertThat(user.userId()).isEqualTo(userId);
        assertThat(user.deviceId()).isEqualTo(deviceId);
        assertThat(user.email()).isEqualTo("user@example.com");
    }

    @Test
    void rejectsTamperedToken() {
        String token = jwtService.createAccessToken(UUID.randomUUID(), UUID.randomUUID(), "user@example.com");

        assertThatThrownBy(() -> jwtService.verify(token + "tampered"))
                .isInstanceOf(InvalidTokenException.class);
    }
}
