package com.moneymanager.exportdata;

public record ExportResponse(
        String fileName,
        String contentType,
        String base64Content
) {
}
