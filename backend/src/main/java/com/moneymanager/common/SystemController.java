package com.moneymanager.common;

import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/system")
public class SystemController {

    @GetMapping("/status")
    ApiResponse<Map<String, String>> status() {
        return ApiResponse.ok(Map.of(
                "application", "PennyCheck",
                "phase", "1-9",
                "status", "ready"
        ));
    }
}
