package com.hirehearsal.coach;

import static org.assertj.core.api.Assertions.assertThat;

import com.hirehearsal.coach.CoachTypes.EvaluationInput;
import com.hirehearsal.coach.CoachTypes.NextPlan;
import com.hirehearsal.coach.CoachTypes.TurnOutcome;
import com.hirehearsal.coach.llm.ChatMessage;
import com.hirehearsal.coach.llm.LlmGateway;
import com.hirehearsal.interview.Persona;
import com.hirehearsal.interview.Round;
import com.hirehearsal.interview.Tier;
import com.hirehearsal.interview.Track;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class CoachServiceTest {

    /** A scripted LLM: returns queued replies in order. */
    static final class ScriptedGateway implements LlmGateway {
        final Deque<Optional<String>> replies = new ArrayDeque<>();
        int calls;

        @Override
        public boolean enabled() {
            return true;
        }

        @Override
        public Optional<String> complete(List<ChatMessage> messages, int maxTokens) {
            calls++;
            return replies.isEmpty() ? Optional.empty() : replies.poll();
        }

        @Override
        public String model() {
            return "test-model";
        }

        @Override
        public int keysConfigured() {
            return 1;
        }

        @Override
        public int keysAvailable() {
            return 1;
        }
    }

    private static final QuestionBank BANK = QuestionBank.load();
    private final ScriptedGateway gateway = new ScriptedGateway();
    private final CoachService coach;

    CoachServiceTest() {
        AnswerAnalyzer analyzer = new AnswerAnalyzer(BANK);
        coach = new CoachService(gateway, new PromptLibrary(JsonMapper.shared()),
                new LlmReplyParser(JsonMapper.shared()), new HeuristicCoach(BANK, analyzer), analyzer, BANK);
    }

    private final InterviewBrief brief = new InterviewBrief(Track.TECHNICAL, Persona.PANELIST, "SDE Intern",
            "DBMS", null, null, null, 3);

    private EvaluationInput input(String answer, NextPlan next) {
        return new EvaluationInput(1, Round.TECHNICAL, Tier.CORE, "What is normalization?", answer, false, false,
                List.of("What is normalization?"), next);
    }

    @Test
    void usesTheLlmEvaluationAndNextQuestionWhenValid() {
        gateway.replies.add(Optional.of("""
                {"score": 9, "rubric": {"substance": 9, "clarity": 8, "depth": 9},
                 "feedback": "Precise and well structured.", "tip": "Mention BCNF.",
                 "outline": ["Define it", "Walk through normal forms"],
                 "nextQuestion": "When would you denormalize?"}"""));

        TurnOutcome outcome = coach.evaluate(brief, input("Normalization removes redundancy because...",
                new NextPlan(2, Round.TECHNICAL, null)), 11);

        assertThat(outcome.evaluation().evaluatedBy()).isEqualTo("llm");
        assertThat(outcome.evaluation().score()).isEqualTo(9);
        assertThat(outcome.next().question()).isEqualTo("When would you denormalize?");
        assertThat(outcome.next().source()).isEqualTo("llm");
        assertThat(outcome.next().tier()).isEqualTo(Tier.STRETCH);
    }

    @Test
    void fallsBackToHeuristicsWhenTheReplyIsMalformed() {
        gateway.replies.add(Optional.of("I think the answer was good!"));

        TurnOutcome outcome = coach.evaluate(brief, input("Normalization organises tables to reduce redundancy.",
                new NextPlan(2, Round.TECHNICAL, null)), 11);

        assertThat(outcome.evaluation().evaluatedBy()).isEqualTo("heuristic");
        assertThat(outcome.next().source()).isEqualTo("bank");
    }

    @Test
    void replacesARepeatedLlmQuestionWithABankQuestion() {
        gateway.replies.add(Optional.of("""
                {"score": 6, "rubric": {"substance": 6, "clarity": 6, "depth": 6},
                 "feedback": "Fine.", "nextQuestion": "What is normalization?"}"""));

        TurnOutcome outcome = coach.evaluate(brief, input("It reduces duplicate data in tables.",
                new NextPlan(2, Round.TECHNICAL, null)), 11);

        assertThat(outcome.next().source()).isEqualTo("bank");
        assertThat(outcome.next().question()).isNotEqualTo("What is normalization?");
    }

    @Test
    void skippedAnswersNeverSpendAnLlmCall() {
        TurnOutcome outcome = coach.evaluate(brief, new EvaluationInput(1, Round.TECHNICAL, Tier.CORE,
                "What is normalization?", "", true, false, List.of("What is normalization?"), null), 11);

        assertThat(gateway.calls).isZero();
        assertThat(outcome.evaluation().score()).isZero();
        assertThat(outcome.next()).isNull();
    }

    @Test
    void drillsKeepTheirFixedQuestions() {
        gateway.replies.add(Optional.of("""
                {"score": 7, "rubric": {"substance": 7, "clarity": 7, "depth": 7},
                 "feedback": "Good.", "nextQuestion": "Something else entirely?"}"""));

        TurnOutcome outcome = coach.evaluate(brief, input("Normalization reduces redundancy.",
                new NextPlan(2, Round.TECHNICAL, "Explain BCNF.")), 11);

        assertThat(outcome.next().question()).isEqualTo("Explain BCNF.");
        assertThat(outcome.next().source()).isEqualTo("custom");
    }
}
