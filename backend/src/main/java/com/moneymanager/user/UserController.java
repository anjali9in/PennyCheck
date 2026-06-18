package com.moneymanager.user;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users/me")
    ApiResponse<UserProfileResponse> me() {
        return ApiResponse.ok(userService.me(CurrentUser.userId()));
    }

    @GetMapping("/devices")
    ApiResponse<List<DeviceResponse>> devices() {
        return ApiResponse.ok(userService.devices(CurrentUser.userId()));
    }

    @DeleteMapping("/devices/{deviceId}")
    ApiResponse<Void> remoteLogout(@PathVariable UUID deviceId) {
        userService.remoteLogout(CurrentUser.userId(), deviceId);
        return ApiResponse.ok(null);
    }
}
