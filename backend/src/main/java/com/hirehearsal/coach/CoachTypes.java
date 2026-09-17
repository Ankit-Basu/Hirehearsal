package com.hirehearsal.coach;

import com.hirehearsal.interview.Round;
import com.hirehearsal.interview.Tier;
import java.util.List;

/** Small value types exchanged between the interview service and the coach. */
public final class CoachTypes {

    private CoachTypes() {
    }

    /** A question ready to be asked. {@code source} is {@code llm}, {@code bank} or {@code custom}. */
    public record QuestionDraft(String question, Tier tier, String source) {
    }

    /** The scored result for one answer. {@code evaluatedBy} is {@code llm} or {@code heuristic}. */
    public record Evaluation(
            int score,
            int substance,
            int clarity,
            int depth,
            String feedback,
            String tip,
            List<String> outline,
            String evaluatedBy,
            int wordCount,
            int fillerCount) {
    }

    /** What comes after the current question. {@code fixedQuestion} is set for retry drills. */
    public record NextPlan(int index, Round round, String fixedQuestion) {
    }

    public record EvaluationInput(
            int index,
            Round round,
            Tier tier,
            String question,
            String answer,
            boolean skipped,
            boolean hintUsed,
            List<String> askedQuestions,
            NextPlan next) {
    }

    public record TurnOutcome(Evaluation evaluation, QuestionDraft next) {
    }

    public record HintResult(String hint, String source) {
    }

    public record AnswerSignals(
            int words,
            boolean hasPunctuation,
            int sentences,
            double avgSentenceLength,
            int connectors,
            int examples,
            int signposts,
            int fillers,
            int star,
            boolean quantified,
            double overlap,
            List<String> keywords) {
    }

    /** A validated evaluation parsed from the LLM reply. */
    public record LlmEvaluation(
            int score,
            int substance,
            int clarity,
            int depth,
            String feedback,
            String tip,
            List<String> outline,
            String nextQuestion) {
    }
}
