package com.hirehearsal.insights;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/insights")
@Tag(name = "Insights", description = "Anonymous community statistics")
public class InsightsController {

    private final InsightsService service;

    public InsightsController(InsightsService service) {
        this.service = service;
    }

    @GetMapping
    @Operation(summary = "Community statistics",
            description = "Totals, averages, rubric scores, popular focus areas and 14-day activity.")
    public InsightsResponse insights() {
        return service.insights();
    }
}
