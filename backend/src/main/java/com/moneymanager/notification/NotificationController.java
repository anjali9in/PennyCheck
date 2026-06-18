package com.moneymanager.notification;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    ApiResponse<List<NotificationResponse>> list() {
        return ApiResponse.ok(notificationService.list(CurrentUser.userId()));
    }

    @PostMapping
    ApiResponse<NotificationResponse> create(@Valid @RequestBody CreateNotificationRequest request) {
        return ApiResponse.ok(notificationService.create(CurrentUser.userId(), request));
    }

    @PatchMapping("/{notificationId}/read")
    ApiResponse<Void> read(@PathVariable UUID notificationId) {
        notificationService.markRead(CurrentUser.userId(), notificationId);
        return ApiResponse.ok(null);
    }
}
