package com.moneymanager.recurring;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record RecurringResponse(
        UUID id,
        UUID accountId,
        UUID categoryId,
        String name,
        BigDecimal amount,
        String currency,
        RecurringFrequency frequency,
        String rrule,
        LocalDate startDate,
        LocalDate endDate,
        Instant nextOccurrenceAt,
        boolean autoCreate,
        boolean paused
) {
}
