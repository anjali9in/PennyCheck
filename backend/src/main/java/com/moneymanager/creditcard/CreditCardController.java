package com.moneymanager.creditcard;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/credit-cards")
public class CreditCardController {

    private final CreditCardService creditCardService;

    public CreditCardController(CreditCardService creditCardService) {
        this.creditCardService = creditCardService;
    }

    @GetMapping("/summary")
    ApiResponse<List<CreditCardSummary>> summaries() {
        return ApiResponse.ok(creditCardService.summaries(CurrentUser.userId()));
    }
}
