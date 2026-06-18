package com.moneymanager.importdata;

import java.util.Set;
import java.util.UUID;

public record ImportConfirmRequest(
        Set<UUID> approvedRowIds
) {
}
