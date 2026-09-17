package com.hirehearsal;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class HirehearsalApplication {

    public static void main(String[] args) {
        SpringApplication.run(HirehearsalApplication.class, args);
    }
}
