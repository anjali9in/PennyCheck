package com.moneymanager.importdata;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ImportPreviewRequest(
        @NotNull UUID accountId,
        @NotNull StatementFileType fileType,
        @NotBlank String fileName,
        @NotBlank String contentBase64,
        @Valid @NotNull ImportColumnMapping mapping,
        String dateFormat,
        boolean allowDuplicates
) {
}
