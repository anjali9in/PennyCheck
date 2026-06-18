package com.moneymanager.auth.dto;

public record AcceptedResponse(
        boolean accepted,
        String developmentToken
) {
}
