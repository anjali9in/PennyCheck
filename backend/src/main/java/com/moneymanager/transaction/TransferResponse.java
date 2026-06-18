package com.moneymanager.transaction;

public record TransferResponse(
        TransactionResponse debit,
        TransactionResponse credit
) {
}
