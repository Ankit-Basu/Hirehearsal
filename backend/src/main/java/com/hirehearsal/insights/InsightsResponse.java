package com.hirehearsal.insights;

import com.hirehearsal.interview.dto.InterviewResponses.RubricAverages;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Anonymous, aggregate community statistics. No individual interview content is exposed. */
public record InsightsResponse(
        Totals totals,
        Averages averages,
        RubricAverages rubric,
        Map<String, Long> tracks,
        Map<String, Long> personas,
        List<FocusArea> popularFocusAreas,
        List<DailyActivity> daily,
        Instant generatedAt) {

    public record Totals(long interviews, long finished, int completionRate, long answers) {
    }

    public record Averages(
            Double score,
            Double preConfidence,
            Double postConfidence,
            Double confidenceDelta,
            Integer wpm,
            Double fillersPerAnswer) {
    }

    public record FocusArea(String topic, long interviews) {
    }

    public record DailyActivity(LocalDate date, long interviews, Double avgScore) {
    }
}
