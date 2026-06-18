package com.moneymanager.importdata;

import java.util.UUID;

public record ImportConfirmResponse(
        UUID importBatchId,
        int importedCount,
        int skippedCount,
        int failedCount
) {
}
