package com.moneymanager.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    OpenAPI pennyCheckOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("PennyCheck API")
                        .version("v1")
                        .description("Versioned REST API for PennyCheck personal finance synchronization."));
    }
}
