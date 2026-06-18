package com.moneymanager.sync;

import java.util.List;

public record SyncPullResponse(
        List<SyncChangeResponse> changes,
        long serverCursor
) {
}
