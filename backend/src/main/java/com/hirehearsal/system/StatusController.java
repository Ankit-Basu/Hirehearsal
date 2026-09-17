package com.hirehearsal.system;

import com.hirehearsal.coach.llm.LlmGateway;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Clock;
import java.time.Instant;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/status")
@Tag(name = "System")
public class StatusController {

    public record StatusResponse(
            String status,
            String version,
            String engine,
            String model,
            int keysConfigured,
            int keysAvailable,
            Instant time) {
    }

    private final LlmGateway llm;
    private final Clock clock;

    public StatusController(LlmGateway llm, Clock clock) {
        this.llm = llm;
        this.clock = clock;
    }

    @GetMapping
    @Operation(summary = "API status", description = "Whether the AI engine is available. Never reveals keys.")
    public StatusResponse status() {
        boolean enabled = llm.enabled();
        return new StatusResponse("ok", "1.0.0", enabled ? "llm" : "offline", enabled ? llm.model() : null,
                llm.keysConfigured(), llm.keysAvailable(), clock.instant());
    }
}
