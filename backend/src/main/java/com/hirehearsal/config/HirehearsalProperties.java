package com.hirehearsal.config;

import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Typed configuration for everything under the {@code hirehearsal.*} prefix.
 */
@ConfigurationProperties(prefix = "hirehearsal")
public record HirehearsalProperties(
        @DefaultValue Llm llm,
        @DefaultValue Security security,
        @DefaultValue Cors cors,
        @DefaultValue RateLimit rateLimit) {

    public record Llm(
            @DefaultValue("https://api.groq.com/openai/v1") String baseUrl,
            @DefaultValue("openai/gpt-oss-120b") String model,
            @DefaultValue List<String> apiKeys,
            @DefaultValue("20s") Duration timeout,
            @DefaultValue("0.4") double temperature,
            /* Sent as reasoning_effort for reasoning models; leave blank for models that don't accept it. */
            @DefaultValue("low") String reasoningEffort,
            @DefaultValue("30s") Duration rateLimitCooldown,
            @DefaultValue("10m") Duration invalidKeyCooldown) {

        /** Keys with blanks and duplicates removed, in configured order. */
        public List<String> usableKeys() {
            if (apiKeys == null) {
                return List.of();
            }
            return apiKeys.stream().map(String::trim).filter(key -> !key.isEmpty()).distinct().toList();
        }
    }

    public record Security(
            @DefaultValue("hirehearsal-dev-secret-change-me-before-deploying-0001") String jwtSecret,
            @DefaultValue("7d") Duration tokenTtl) {
    }

    public record Cors(@DefaultValue("http://localhost:3000") List<String> allowedOrigins) {
    }

    public record RateLimit(
            @DefaultValue("true") boolean enabled,
            @DefaultValue("90") int interviewRequests,
            @DefaultValue("10m") Duration interviewWindow,
            @DefaultValue("12") int authRequests,
            @DefaultValue("1m") Duration authWindow) {
    }
}
