package com.moneymanager.importdata;

import java.util.List;
import java.util.UUID;

public record ImportPreviewResponse(
        UUID importBatchId,
        List<String> headers,
        List<ImportPreviewRow> rows,
        int validCount,
        int duplicateCount,
        int invalidCount
) {
}
