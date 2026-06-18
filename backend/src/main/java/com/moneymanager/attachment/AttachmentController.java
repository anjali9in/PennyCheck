package com.moneymanager.attachment;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/attachments")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    @GetMapping
    ApiResponse<List<AttachmentResponse>> list(@RequestParam(required = false) UUID transactionId) {
        return ApiResponse.ok(attachmentService.list(CurrentUser.userId(), transactionId));
    }

    @PostMapping
    ApiResponse<AttachmentResponse> create(@Valid @RequestBody CreateAttachmentRequest request) {
        return ApiResponse.ok(attachmentService.create(CurrentUser.userId(), request));
    }
}
