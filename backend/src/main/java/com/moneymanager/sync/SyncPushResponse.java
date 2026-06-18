package com.moneymanager.sync;

import java.util.List;

public record SyncPushResponse(
        List<SyncChangeResponse> accepted,
        List<SyncChangeResponse> conflicts,
        long serverCursor
) {
}
