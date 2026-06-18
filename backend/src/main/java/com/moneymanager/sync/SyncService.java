package com.moneymanager.sync;

import com.moneymanager.auth.AuthenticatedUser;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SyncService {

    private final SyncRepository syncRepository;

    public SyncService(SyncRepository syncRepository) {
        this.syncRepository = syncRepository;
    }

    @Transactional
    public SyncPushResponse push(AuthenticatedUser user, SyncPushRequest request) {
        List<SyncChangeResponse> accepted = new ArrayList<>();
        List<SyncChangeResponse> conflicts = new ArrayList<>();

        for (SyncChangeRequest change : request.changes()) {
            SyncChangeResponse response = syncRepository
                    .findExisting(user.userId(), user.deviceId(), change.clientChangeId())
                    .orElseGet(() -> insertWithConflictCheck(user, change));
            if ("CONFLICT".equals(response.status())) {
                conflicts.add(response);
            } else {
                accepted.add(response);
            }
        }

        return new SyncPushResponse(accepted, conflicts, syncRepository.cursor(user.userId()));
    }

    public SyncPullResponse pull(AuthenticatedUser user, long afterCursor, int limit) {
        List<SyncChangeResponse> changes = syncRepository.pull(user.userId(), user.deviceId(), afterCursor, limit);
        long cursor = changes.isEmpty() ? syncRepository.cursor(user.userId()) : changes.get(changes.size() - 1).serverVersion();
        return new SyncPullResponse(changes, cursor);
    }

    private SyncChangeResponse insertWithConflictCheck(AuthenticatedUser user, SyncChangeRequest change) {
        Long latest = syncRepository.latestServerVersion(user.userId(), change.entityType(), change.entityId());
        boolean conflict = change.baseVersion() != null && latest != null && latest > change.baseVersion();
        if (conflict) {
            return syncRepository.insert(
                    user.userId(),
                    user.deviceId(),
                    change,
                    "CONFLICT",
                    "Remote version " + latest + " is newer than base version " + change.baseVersion()
            );
        }
        return syncRepository.insert(user.userId(), user.deviceId(), change, "APPLIED", null);
    }
}
