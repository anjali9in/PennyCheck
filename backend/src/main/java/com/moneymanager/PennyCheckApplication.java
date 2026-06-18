package com.moneymanager;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@ConfigurationPropertiesScan
@SpringBootApplication
public class PennyCheckApplication {

    public static void main(String[] args) {
        SpringApplication.run(PennyCheckApplication.class, args);
    }
}
