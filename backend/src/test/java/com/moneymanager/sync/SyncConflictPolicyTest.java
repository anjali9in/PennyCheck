package com.moneymanager.sync;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SyncConflictPolicyTest {

    @Test
    void staleBaseVersionIsConflict() {
        assertThat(isConflict(3L, 4L)).isTrue();
        assertThat(isConflict(4L, 4L)).isFalse();
        assertThat(isConflict(null, 4L)).isFalse();
    }

    private boolean isConflict(Long baseVersion, Long latestServerVersion) {
        return baseVersion != null && latestServerVersion != null && latestServerVersion > baseVersion;
    }
}
