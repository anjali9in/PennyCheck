package com.moneymanager.user;

import com.moneymanager.auth.AuthRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final AuthRepository authRepository;

    public UserService(AuthRepository authRepository) {
        this.authRepository = authRepository;
    }

    @Transactional(readOnly = true)
    public UserProfileResponse me(UUID userId) {
        return authRepository.getProfile(userId);
    }

    @Transactional(readOnly = true)
    public List<DeviceResponse> devices(UUID userId) {
        return authRepository.listDevices(userId);
    }

    @Transactional
    public void remoteLogout(UUID userId, UUID deviceId) {
        authRepository.remoteLogoutDevice(userId, deviceId);
    }
}
