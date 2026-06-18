package com.moneymanager.investment;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class InvestmentService {

    private final InvestmentRepository investmentRepository;

    public InvestmentService(InvestmentRepository investmentRepository) {
        this.investmentRepository = investmentRepository;
    }

    public List<InvestmentResponse> list(UUID userId) {
        return investmentRepository.list(userId);
    }

    public InvestmentResponse create(UUID userId, CreateInvestmentRequest request) {
        return investmentRepository.create(userId, request);
    }
}
