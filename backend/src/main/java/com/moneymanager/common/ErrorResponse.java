package com.moneymanager.common;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
        String code,
        String message,
        String correlationId,
        Map<String, String> fieldErrors,
        Instant timestamp
) {
}
