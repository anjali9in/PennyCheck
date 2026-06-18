package com.moneymanager.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.security")
public record AppSecurityProperties(
        List<String> allowedOrigins,
        boolean hstsEnabled
) {
    public List<String> allowedOrigins() {
        return allowedOrigins == null || allowedOrigins.isEmpty()
                ? List.of("http://localhost:19006", "http://localhost:8081")
                : allowedOrigins;
    }
}
