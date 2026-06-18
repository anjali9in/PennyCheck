package com.moneymanager.importdata;

public record StatementTextExtractionResponse(
        String fileName,
        String contentType,
        String text
) {
}
