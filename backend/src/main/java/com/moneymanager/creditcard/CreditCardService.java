package com.moneymanager.creditcard;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CreditCardService {

    private final CreditCardRepository creditCardRepository;

    public CreditCardService(CreditCardRepository creditCardRepository) {
        this.creditCardRepository = creditCardRepository;
    }

    public List<CreditCardSummary> summaries(UUID userId) {
        return creditCardRepository.summaries(userId);
    }
}
