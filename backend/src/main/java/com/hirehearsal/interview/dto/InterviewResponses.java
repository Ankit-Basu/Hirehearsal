package com.hirehearsal.interview.dto;

import com.hirehearsal.interview.InterviewStatus;
import com.hirehearsal.interview.Persona;
import com.hirehearsal.interview.Round;
import com.hirehearsal.interview.Tier;
import com.hirehearsal.interview.Track;
import java.time.Instant;
import java.util.List;

public final class InterviewResponses {

    private InterviewResponses() {
    }

    public record QuestionView(int index, Round round, String question) {
    }

    public record InterviewStartedResponse(
            String id,
            Track track,
            Persona persona,
            String headline,
            int questionCount,
            int preConfidence,
            boolean drill,
            String engine,
            String opener,
            QuestionView question,
            Instant createdAt) {
    }

    public record RubricScores(int substance, int clarity, int depth) {
    }

    public record EvaluationView(
            int index,
            int score,
            RubricScores rubric,
            String feedback,
            String tip,
            List<String> outline,
            boolean skipped,
            boolean hintUsed,
            String evaluatedBy,
            int wordCount,
            int fillerCount,
            Integer wpm) {
    }

    public record AnswerResultResponse(EvaluationView evaluation, QuestionView next, boolean completed, String engine) {
    }

    public record HintResponse(int index, String hint, String source) {
    }

    public record RubricAverages(Double substance, Double clarity, Double depth) {
    }

    public record SpeechSummary(Integer avgWpm, int fillerCount, int totalWords, int speakingSeconds) {
    }

    public record TurnReview(
            int index,
            Round round,
            Tier tier,
            String question,
            boolean answered,
            String answer,
            boolean skipped,
            boolean hintUsed,
            String hint,
            Integer score,
            RubricScores rubric,
            String feedback,
            String tip,
            List<String> outline,
            String evaluatedBy,
            Integer wordCount,
            Integer fillerCount,
            Integer speakingSeconds,
            Integer durationSeconds,
            String inputMode,
            Integer wpm) {
    }

    public record ScorecardResponse(
            String id,
            Track track,
            Persona persona,
            InterviewStatus status,
            String headline,
            String role,
            String topic,
            String projectName,
            boolean drill,
            String sourceInterviewId,
            int questionCount,
            int answeredCount,
            boolean endedEarly,
            int preConfidence,
            Integer postConfidence,
            Integer confidenceDelta,
            String reflection,
            Double overallScore,
            String band,
            RubricAverages rubric,
            SpeechSummary speech,
            List<String> highlights,
            List<String> focusAreas,
            List<TurnReview> turns,
            boolean owned,
            String engine,
            Instant createdAt,
            Instant finishedAt) {
    }

    public record InterviewSummary(
            String id,
            Track track,
            Persona persona,
            InterviewStatus status,
            String headline,
            Double overallScore,
            Integer confidenceDelta,
            int answeredCount,
            int questionCount,
            boolean drill,
            Instant createdAt) {
    }

    public record PageView<T>(List<T> items, int page, int size, long totalItems, int totalPages) {
    }
}
