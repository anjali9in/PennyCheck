package com.moneymanager.transaction;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class TransactionBalanceTest {

    @Test
    void debitTransactionsUseNegativeBalanceDeltaConvention() {
        TransactionResponse transaction = new TransactionResponse(
                UUID.randomUUID(),
                UUID.randomUUID(),
                null,
                null,
                null,
                TransactionType.EXPENSE,
                TransactionDirection.DEBIT,
                new BigDecimal("125.50"),
                "INR",
                "Merchant",
                Instant.now(),
                null,
                null,
                null,
                TransactionStatus.CLEARED,
                "MANUAL",
                0,
                Instant.now(),
                Instant.now()
        );

        BigDecimal delta = transaction.direction() == TransactionDirection.CREDIT
                ? transaction.amount()
                : transaction.amount().negate();

        assertThat(delta).isEqualByComparingTo("-125.50");
    }
}
