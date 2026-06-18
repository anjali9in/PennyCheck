package com.moneymanager.attachment;

import java.time.Instant;
import java.util.UUID;

public record AttachmentResponse(
        UUID id,
        UUID transactionId,
        String fileName,
        String contentType,
        long sizeBytes,
        String storageKey,
        String sha256Hash,
        String uploadUrl,
        String downloadUrl,
        Instant createdAt
) {
}
