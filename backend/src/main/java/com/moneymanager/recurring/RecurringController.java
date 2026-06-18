package com.moneymanager.recurring;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class RecurringController {

    private final RecurringService recurringService;

    public RecurringController(RecurringService recurringService) {
        this.recurringService = recurringService;
    }

    @GetMapping("/recurring-transactions")
    ApiResponse<List<RecurringResponse>> recurring() {
        return ApiResponse.ok(recurringService.list(CurrentUser.userId()));
    }

    @PostMapping("/recurring-transactions")
    ApiResponse<RecurringResponse> create(@Valid @RequestBody CreateRecurringRequest request) {
        return ApiResponse.ok(recurringService.create(CurrentUser.get(), request));
    }

    @PatchMapping("/recurring-transactions/{recurringId}/paused")
    ApiResponse<Void> pause(@PathVariable UUID recurringId, @RequestParam boolean paused) {
        recurringService.setPaused(CurrentUser.userId(), recurringId, paused);
        return ApiResponse.ok(null);
    }

    @GetMapping("/subscriptions")
    ApiResponse<List<SubscriptionResponse>> subscriptions() {
        return ApiResponse.ok(recurringService.detectAndListSubscriptions(CurrentUser.userId()));
    }
}
