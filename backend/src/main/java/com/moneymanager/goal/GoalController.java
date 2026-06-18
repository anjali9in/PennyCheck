package com.moneymanager.goal;

import com.moneymanager.auth.CurrentUser;
import com.moneymanager.common.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/goals")
public class GoalController {

    private final GoalService goalService;

    public GoalController(GoalService goalService) {
        this.goalService = goalService;
    }

    @GetMapping
    ApiResponse<List<GoalResponse>> list() {
        return ApiResponse.ok(goalService.list(CurrentUser.userId()));
    }

    @PostMapping
    ApiResponse<GoalResponse> create(@Valid @RequestBody CreateGoalRequest request) {
        return ApiResponse.ok(goalService.create(CurrentUser.userId(), request));
    }
}
