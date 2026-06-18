package com.moneymanager.importdata;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class ImportController {

    private final ImportService importService;
    private final CategorizationService categorizationService;
    private final StatementTextExtractor statementTextExtractor;

    public ImportController(
            ImportService importService,
            CategorizationService categorizationService,
            StatementTextExtractor statementTextExtractor
    ) {
        this.importService = importService;
        this.categorizationService = categorizationService;
        this.statementTextExtractor = statementTextExtractor;
    }

    @PostMapping("/imports/preview")
    ApiResponse<ImportPreviewResponse> preview(@Valid @RequestBody ImportPreviewRequest request) {
        return ApiResponse.ok(importService.preview(CurrentUser.get(), request));
    }

    @PostMapping("/imports/{batchId}/confirm")
    ApiResponse<ImportConfirmResponse> confirm(@PathVariable UUID batchId, @RequestBody ImportConfirmRequest request) {
        return ApiResponse.ok(importService.confirm(CurrentUser.get(), batchId, request));
    }

    @PostMapping(value = "/imports/extract-text", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    ApiResponse<StatementTextExtractionResponse> extractText(@RequestPart("file") MultipartFile file) {
        CurrentUser.get();
        return ApiResponse.ok(statementTextExtractor.extract(file));
    }

    @GetMapping("/categorization-rules")
    ApiResponse<List<CategorizationRuleResponse>> rules() {
        return ApiResponse.ok(categorizationService.list(CurrentUser.userId()));
    }

    @PostMapping("/categorization-rules")
    ApiResponse<CategorizationRuleResponse> createRule(@Valid @RequestBody CategorizationRuleRequest request) {
        return ApiResponse.ok(categorizationService.create(CurrentUser.userId(), request));
    }
}
