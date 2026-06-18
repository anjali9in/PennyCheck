package com.moneymanager.importdata;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ImportNormalizerTest {

    private final ImportNormalizer normalizer = new ImportNormalizer();

    @Test
    void parsesIndianAmountsAndDates() {
        assertThat(normalizer.parseAmount("₹1,234.50 DR")).isEqualByComparingTo(new BigDecimal("1234.50"));
        assertThat(normalizer.parseDate("12/06/2026", null)).isEqualTo(Instant.parse("2026-06-12T00:00:00Z"));
    }

    @Test
    void extractsUpiMerchant() {
        assertThat(normalizer.merchantFromNarration("UPI-SWIGGY-123456")).isEqualTo("SWIGGY");
    }
}
