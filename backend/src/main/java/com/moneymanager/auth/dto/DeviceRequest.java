package com.moneymanager.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeviceRequest(
        @NotBlank @Size(max = 160) String deviceName,
        @NotBlank @Size(max = 32) String platform,
        @NotBlank @Size(max = 255) String deviceFingerprint,
        @Size(max = 255) String pushToken
) {
}
