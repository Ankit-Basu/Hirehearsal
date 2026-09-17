package com.hirehearsal.coach.llm;

import com.hirehearsal.config.HirehearsalProperties;
import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Talks to any OpenAI-compatible chat completions API (Groq by default). Requests rotate through the key pool;
 * a 429 parks the key for its Retry-After window and a 401/403 parks it longer, then the next key is tried.
 */
@Component
public class OpenAiCompatibleGateway implements LlmGateway {

    private static final Logger log = LoggerFactory.getLogger(OpenAiCompatibleGateway.class);
    private static final int MAX_ATTEMPTS = 3;
    private static final Duration MAX_RETRY_AFTER = Duration.ofMinutes(5);

    private final HirehearsalProperties.Llm config;
    private final LlmKeyPool pool;
    private final RestClient client;

    public OpenAiCompatibleGateway(RestClient.Builder builder, HirehearsalProperties properties, Clock clock) {
        this.config = properties.llm();
        this.pool = new LlmKeyPool(config.usableKeys(), clock);

        JdkClientHttpRequestFactory requestFactory = new JdkClientHttpRequestFactory(
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build());
        requestFactory.setReadTimeout(config.timeout());
        this.client = builder.baseUrl(config.baseUrl()).requestFactory(requestFactory).build();

        if (pool.size() == 0) {
            log.info("No LLM API keys configured; interviews will use the offline heuristic coach.");
        } else {
            log.info("LLM gateway ready: model={}, keys={}", config.model(), pool.size());
        }
    }

    @Override
    public boolean enabled() {
        return pool.size() > 0;
    }

    @Override
    public String model() {
        return config.model();
    }

    @Override
    public int keysConfigured() {
        return pool.size();
    }

    @Override
    public int keysAvailable() {
        return pool.available();
    }

    @Override
    public Optional<String> complete(List<ChatMessage> messages, int maxTokens) {
        int attempts = Math.min(MAX_ATTEMPTS, pool.size());
        for (int attempt = 1; attempt <= attempts; attempt++) {
            Optional<String> key = pool.next();
            if (key.isEmpty()) {
                log.warn("Every LLM key is cooling down; falling back to the offline coach.");
                return Optional.empty();
            }
            String fingerprint = LlmKeyPool.fingerprint(key.get());
            long started = System.nanoTime();
            try {
                Map<?, ?> response = client.post()
                        .uri("/chat/completions")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + key.get())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(requestBody(messages, maxTokens))
                        .retrieve()
                        .body(Map.class);
                Optional<String> content = extractContent(response);
                log.debug("LLM reply in {} ms via key {}", (System.nanoTime() - started) / 1_000_000, fingerprint);
                return content;
            } catch (HttpStatusCodeException ex) {
                int status = ex.getStatusCode().value();
                if (status == 429) {
                    Duration wait = retryAfter(ex);
                    pool.coolDown(key.get(), wait);
                    log.warn("Key {} rate-limited; parked for {}s", fingerprint, wait.toSeconds());
                } else if (status == 401 || status == 403) {
                    pool.coolDown(key.get(), config.invalidKeyCooldown());
                    log.warn("Key {} rejected ({}); parked for {}", fingerprint, status, config.invalidKeyCooldown());
                } else if (status >= 500) {
                    log.warn("LLM provider error {} on key {}; trying the next key", status, fingerprint);
                } else {
                    log.warn("LLM request rejected ({}): {}", status, ex.getResponseBodyAsString());
                    return Optional.empty();
                }
            } catch (RestClientException ex) {
                log.warn("LLM call failed: {}", ex.getMessage());
                return Optional.empty();
            }
        }
        return Optional.empty();
    }

    private Map<String, Object> requestBody(List<ChatMessage> messages, int maxTokens) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("model", config.model());
        body.put("messages", messages.stream()
                .map(message -> Map.of("role", message.role(), "content", message.content()))
                .toList());
        body.put("temperature", config.temperature());
        body.put("max_tokens", maxTokens);
        if (config.reasoningEffort() != null && !config.reasoningEffort().isBlank()) {
            body.put("reasoning_effort", config.reasoningEffort().trim());
        }
        body.put("response_format", Map.of("type", "json_object"));
        return body;
    }

    private static Optional<String> extractContent(Map<?, ?> response) {
        if (response == null || !(response.get("choices") instanceof List<?> choices) || choices.isEmpty()) {
            return Optional.empty();
        }
        if (choices.get(0) instanceof Map<?, ?> choice && choice.get("message") instanceof Map<?, ?> message
                && message.get("content") instanceof String content && !content.isBlank()) {
            return Optional.of(content);
        }
        return Optional.empty();
    }

    private Duration retryAfter(HttpStatusCodeException ex) {
        String header = ex.getResponseHeaders() == null ? null : ex.getResponseHeaders().getFirst("retry-after");
        if (header != null) {
            try {
                Duration parsed = Duration.ofMillis((long) (Double.parseDouble(header.trim()) * 1000));
                if (!parsed.isNegative() && !parsed.isZero()) {
                    return parsed.compareTo(MAX_RETRY_AFTER) > 0 ? MAX_RETRY_AFTER : parsed;
                }
            } catch (NumberFormatException ignored) {
                // Retry-After may also be an HTTP date; the configured cooldown is a sensible default.
            }
        }
        return config.rateLimitCooldown();
    }
}
