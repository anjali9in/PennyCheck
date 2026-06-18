package com.moneymanager.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.auth")
public record AuthProperties(
        boolean exposeDevelopmentTokens,
        int rateLimitWindowSeconds,
        int maxAuthAttempts
) {
}
