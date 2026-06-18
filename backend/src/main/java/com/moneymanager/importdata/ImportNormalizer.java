package com.moneymanager.importdata;

import java.math.BigDecimal;
import java.text.DecimalFormatSymbols;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class ImportNormalizer {

    private static final List<DateTimeFormatter> DEFAULT_DATE_FORMATS = List.of(
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ofPattern("dd-MM-yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd MMM yyyy", Locale.ENGLISH)
    );

    public BigDecimal parseAmount(String value) {
        if (value == null || value.isBlank()) {
            return BigDecimal.ZERO;
        }
        String normalized = value
                .replace("₹", "")
                .replace(",", "")
                .replace("CR", "")
                .replace("DR", "")
                .replace(String.valueOf(DecimalFormatSymbols.getInstance().getCurrencySymbol()), "")
                .trim();
        if (normalized.startsWith("(") && normalized.endsWith(")")) {
            normalized = "-" + normalized.substring(1, normalized.length() - 1);
        }
        return new BigDecimal(normalized);
    }

    public Instant parseDate(String value, String requestedFormat) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Date is required");
        }
        if (requestedFormat != null && !requestedFormat.isBlank()) {
            return LocalDate.parse(value.trim(), DateTimeFormatter.ofPattern(requestedFormat)).atStartOfDay().toInstant(ZoneOffset.UTC);
        }
        for (DateTimeFormatter formatter : DEFAULT_DATE_FORMATS) {
            try {
                return LocalDate.parse(value.trim(), formatter).atStartOfDay().toInstant(ZoneOffset.UTC);
            } catch (RuntimeException ignored) {
                // Try the next common bank statement format.
            }
        }
        return Instant.parse(value.trim());
    }

    public String merchantFromNarration(String narration) {
        if (narration == null || narration.isBlank()) {
            return null;
        }
        String normalized = narration.toUpperCase(Locale.ROOT);
        if (normalized.contains("UPI-")) {
            String[] parts = normalized.split("-");
            if (parts.length >= 2) {
                return parts[1].replaceAll("[^A-Z0-9 ]", "").trim();
            }
        }
        if (normalized.contains("POS")) {
            return normalized.replace("POS", "").replaceAll("[^A-Z0-9 ]", " ").trim();
        }
        return normalized.replaceAll("\\s+", " ").trim();
    }
}
