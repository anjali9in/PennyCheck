package com.moneymanager.sync;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record SyncPushRequest(
        @NotNull List<@Valid SyncChangeRequest> changes
) {
}
