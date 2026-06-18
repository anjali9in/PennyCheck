package com.moneymanager.attachment;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class AttachmentService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg",
            "image/png",
            "application/pdf"
    );
    private static final long MAX_SIZE_BYTES = 10 * 1024 * 1024;

    private final AttachmentRepository attachmentRepository;

    public AttachmentService(AttachmentRepository attachmentRepository) {
        this.attachmentRepository = attachmentRepository;
    }

    public AttachmentResponse create(UUID userId, CreateAttachmentRequest request) {
        if (!ALLOWED_CONTENT_TYPES.contains(request.contentType())) {
            throw new IllegalArgumentException("Unsupported attachment type");
        }
        if (request.sizeBytes() > MAX_SIZE_BYTES) {
            throw new IllegalArgumentException("Attachment is larger than 10 MB");
        }
        String storageKey = "receipts/%s/%s-%s".formatted(userId, UUID.randomUUID(), sanitize(request.fileName()));
        return attachmentRepository.create(
                userId,
                request,
                storageKey,
                "local-s3://upload/" + storageKey,
                "local-s3://download/" + storageKey
        );
    }

    public List<AttachmentResponse> list(UUID userId, UUID transactionId) {
        return attachmentRepository.list(userId, transactionId);
    }

    private String sanitize(String fileName) {
        return fileName.replaceAll("[^A-Za-z0-9._-]", "_");
    }
}
