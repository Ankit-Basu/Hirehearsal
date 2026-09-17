package com.hirehearsal.progress;

import com.hirehearsal.interview.Track;
import com.hirehearsal.interview.dto.InterviewResponses.InterviewSummary;
import com.hirehearsal.interview.dto.InterviewResponses.RubricAverages;
import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * A signed-in candidate's dashboard. {@code readiness} is 0-100, weighted towards the most recent interviews.
 */
public record ProgressResponse(
        int readiness,
        Map<String, Integer> readinessByRound,
        int streakDays,
        boolean practicedToday,
        WeeklyGoal weekly,
        Totals totals,
        List<TrendPoint> trend,
        RubricAverages rubric,
        List<InterviewSummary> recent) {

    public record WeeklyGoal(int goal, int completed) {
    }

    public record Totals(long interviews, long answers, int minutesSpoken) {
    }

    public record TrendPoint(String id, Instant createdAt, Double overallScore, Track track) {
    }
}
