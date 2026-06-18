package com.moneymanager.attachment;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;

public record CreateAttachmentRequest(
        UUID transactionId,
        @NotBlank String fileName,
        @NotBlank String contentType,
        @Min(1) long sizeBytes,
        @NotBlank String sha256Hash
) {
}
