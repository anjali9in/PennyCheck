package com.moneymanager.goal;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GoalService {

    private final GoalRepository goalRepository;

    public GoalService(GoalRepository goalRepository) {
        this.goalRepository = goalRepository;
    }

    public List<GoalResponse> list(UUID userId) {
        return goalRepository.list(userId);
    }

    public GoalResponse create(UUID userId, CreateGoalRequest request) {
        return goalRepository.create(userId, request);
    }
}
