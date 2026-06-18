package com.moneymanager.transaction;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class TransactionController {

    private final TransactionService transactionService;

    public TransactionController(TransactionService transactionService) {
        this.transactionService = transactionService;
    }

    @GetMapping("/transactions")
    ApiResponse<List<TransactionResponse>> list(
            @RequestParam(required = false) UUID accountId,
            @RequestParam(required = false) Instant from,
            @RequestParam(required = false) Instant to,
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(defaultValue = "0") int offset
    ) {
        return ApiResponse.ok(transactionService.list(CurrentUser.userId(), accountId, from, to, limit, offset));
    }

    @PostMapping("/transactions")
    ApiResponse<TransactionResponse> create(@Valid @RequestBody CreateTransactionRequest request) {
        return ApiResponse.ok(transactionService.create(CurrentUser.get(), request));
    }

    @PostMapping("/transfers")
    ApiResponse<TransferResponse> transfer(@Valid @RequestBody CreateTransferRequest request) {
        return ApiResponse.ok(transactionService.transfer(CurrentUser.get(), request));
    }

    @DeleteMapping("/transactions/{transactionId}")
    ApiResponse<Void> delete(@PathVariable UUID transactionId) {
        transactionService.delete(CurrentUser.get(), transactionId);
        return ApiResponse.ok(null);
    }
}
