package com.moneymanager.notification;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @Transactional(readOnly = true)
    public List<NotificationResponse> list(UUID userId) {
        return notificationRepository.list(userId);
    }

    @Transactional
    public NotificationResponse create(UUID userId, CreateNotificationRequest request) {
        return notificationRepository.create(userId, request);
    }

    @Transactional
    public void markRead(UUID userId, UUID notificationId) {
        notificationRepository.markRead(userId, notificationId);
    }
}
