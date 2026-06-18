package com.moneymanager.sync;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/sync")
public class SyncController {

    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    @PostMapping("/push")
    ApiResponse<SyncPushResponse> push(@Valid @RequestBody SyncPushRequest request) {
        return ApiResponse.ok(syncService.push(CurrentUser.get(), request));
    }

    @GetMapping("/pull")
    ApiResponse<SyncPullResponse> pull(
            @RequestParam(defaultValue = "0") long after,
            @RequestParam(defaultValue = "200") int limit
    ) {
        return ApiResponse.ok(syncService.pull(CurrentUser.get(), after, limit));
    }
}
