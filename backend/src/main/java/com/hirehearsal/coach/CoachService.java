package com.hirehearsal.coach;

import com.hirehearsal.coach.CoachTypes.AnswerSignals;
import com.hirehearsal.coach.CoachTypes.Evaluation;
import com.hirehearsal.coach.CoachTypes.EvaluationInput;
import com.hirehearsal.coach.CoachTypes.HintResult;
import com.hirehearsal.coach.CoachTypes.LlmEvaluation;
import com.hirehearsal.coach.CoachTypes.NextPlan;
import com.hirehearsal.coach.CoachTypes.QuestionDraft;
import com.hirehearsal.coach.CoachTypes.TurnOutcome;
import com.hirehearsal.coach.llm.LlmGateway;
import com.hirehearsal.interview.Persona;
import com.hirehearsal.interview.Round;
import com.hirehearsal.interview.Tier;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * Ora, the interviewer. Uses the LLM when it is configured and answers well-formed JSON; otherwise the
 * deterministic heuristic coach and the curated question bank keep the interview going.
 */
@Service
public class CoachService {

    private final LlmGateway llm;
    private final PromptLibrary prompts;
    private final LlmReplyParser parser;
    private final HeuristicCoach heuristic;
    private final AnswerAnalyzer analyzer;
    private final QuestionBank bank;

    public CoachService(LlmGateway llm, PromptLibrary prompts, LlmReplyParser parser, HeuristicCoach heuristic,
                        AnswerAnalyzer analyzer, QuestionBank bank) {
        this.llm = llm;
        this.prompts = prompts;
        this.parser = parser;
        this.heuristic = heuristic;
        this.analyzer = analyzer;
        this.bank = bank;
    }

    public String engine() {
        return llm.enabled() ? "llm" : "offline";
    }

    public String opener(InterviewBrief brief) {
        return heuristic.opener(brief, bank.placeholders(brief));
    }

    public Tier startTier(Persona persona, Round round) {
        return heuristic.startTier(persona, round);
    }

    public QuestionDraft firstQuestion(InterviewBrief brief, Round round, Tier tier, int seed) {
        if (llm.enabled()) {
            Optional<String> question = llm.complete(prompts.firstQuestion(brief, round, tier), 500)
                    .flatMap(parser::question);
            if (question.isPresent()) {
                return new QuestionDraft(question.get(), tier, "llm");
            }
        }
        return bank.pick(round, brief, tier, 1, List.of(), seed);
    }

    public TurnOutcome evaluate(InterviewBrief brief, EvaluationInput input, int seed) {
        boolean skipped = input.skipped() || Text.tokens(input.answer()).isEmpty();

        if (!skipped && llm.enabled()) {
            Optional<LlmEvaluation> reply = llm.complete(prompts.evaluation(brief, input), 1400)
                    .flatMap(parser::evaluation);
            if (reply.isPresent()) {
                LlmEvaluation result = reply.get();
                AnswerSignals signals = analyzer.analyze(input.question(), input.answer(), input.round());
                Evaluation fallback = heuristic.evaluate(input.round(), brief.persona(), input.question(),
                        input.answer(), false, input.hintUsed());
                Evaluation evaluation = new Evaluation(result.score(), result.substance(), result.clarity(),
                        result.depth(), result.feedback(),
                        result.tip() != null ? result.tip() : fallback.tip(),
                        result.outline().isEmpty() ? fallback.outline() : result.outline(),
                        "llm", signals.words(), signals.fillers());
                return new TurnOutcome(evaluation, nextQuestion(brief, input, evaluation.score(), seed,
                        result.nextQuestion()));
            }
        }

        Evaluation evaluation = heuristic.evaluate(input.round(), brief.persona(), input.question(), input.answer(),
                skipped, input.hintUsed());
        return new TurnOutcome(evaluation, nextQuestion(brief, input, evaluation.score(), seed, null));
    }

    public HintResult hint(InterviewBrief brief, Round round, String question) {
        if (llm.enabled()) {
            Optional<String> hint = llm.complete(prompts.hint(brief, round, question), 400).flatMap(parser::hint);
            if (hint.isPresent()) {
                return new HintResult(hint.get(), "llm");
            }
        }
        return new HintResult(heuristic.hint(round, question), "heuristic");
    }

    private QuestionDraft nextQuestion(InterviewBrief brief, EvaluationInput input, int score, int seed,
                                       String llmQuestion) {
        NextPlan plan = input.next();
        if (plan == null) {
            return null;
        }
        Tier nextTier = heuristic.nextTier(brief.persona(), input.tier(), score);
        if (plan.fixedQuestion() != null) {
            return new QuestionDraft(plan.fixedQuestion(), nextTier, "custom");
        }
        if (llmQuestion != null && !alreadyAsked(llmQuestion, input.askedQuestions())) {
            return new QuestionDraft(llmQuestion, nextTier, "llm");
        }
        return bank.pick(plan.round(), brief, nextTier, plan.index(), input.askedQuestions(), seed);
    }

    private static boolean alreadyAsked(String question, List<String> asked) {
        String normalized = Text.normalize(question);
        return asked.stream().map(Text::normalize).anyMatch(normalized::equals);
    }
}
