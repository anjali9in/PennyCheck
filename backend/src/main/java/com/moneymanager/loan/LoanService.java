package com.moneymanager.loan;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class LoanService {

    private final LoanRepository loanRepository;

    public LoanService(LoanRepository loanRepository) {
        this.loanRepository = loanRepository;
    }

    public List<LoanResponse> list(UUID userId) {
        return loanRepository.list(userId);
    }

    public LoanResponse create(UUID userId, CreateLoanRequest request) {
        EmiCalculationResponse calculation = EmiCalculator.calculate(
                request.principal(),
                request.annualInterestRate(),
                request.tenureMonths()
        );
        return loanRepository.create(userId, request, calculation);
    }

    public EmiCalculationResponse calculate(EmiCalculationRequest request) {
        return EmiCalculator.calculate(request.principal(), request.annualInterestRate(), request.tenureMonths());
    }
}
