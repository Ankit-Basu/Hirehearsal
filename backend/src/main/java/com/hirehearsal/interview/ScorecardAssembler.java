package com.hirehearsal.interview;

import com.hirehearsal.coach.BankModel;
import com.hirehearsal.coach.QuestionBank;
import com.hirehearsal.coach.Text;
import com.hirehearsal.interview.dto.InterviewResponses.EvaluationView;
import com.hirehearsal.interview.dto.InterviewResponses.InterviewSummary;
import com.hirehearsal.interview.dto.InterviewResponses.RubricAverages;
import com.hirehearsal.interview.dto.InterviewResponses.RubricScores;
import com.hirehearsal.interview.dto.InterviewResponses.ScorecardResponse;
import com.hirehearsal.interview.dto.InterviewResponses.SpeechSummary;
import com.hirehearsal.interview.dto.InterviewResponses.TurnReview;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import org.springframework.stereotype.Component;

/**
 * Builds scorecards: averages, speaking analytics, and plain-language highlights and focus areas. Mirrored by
 * {@code src/lib/engine/scorecard.ts} for offline interviews.
 */
@Component
public class ScorecardAssembler {

    private static final int MAX_NOTES = 3;

    private final BankModel.Report copy;

    public ScorecardAssembler(QuestionBank bank) {
        this.copy = bank.model().coach().report();
    }

    public static Double overallScore(List<InterviewTurn> turns) {
        List<InterviewTurn> scored = turns.stream()
                .filter(InterviewTurn::isAnswered)
                .filter(turn -> turn.getScore() != null)
                .toList();
        if (scored.isEmpty()) {
            return null;
        }
        return round1(scored.stream().mapToInt(InterviewTurn::getScore).average().orElse(0));
    }

    public ScorecardResponse scorecard(Interview interview) {
        List<InterviewTurn> turns = interview.getTurns().stream()
                .sorted(Comparator.comparingInt(InterviewTurn::getTurnIndex))
                .toList();
        List<InterviewTurn> answered = turns.stream().filter(InterviewTurn::isAnswered).toList();
        List<InterviewTurn> attempted = answered.stream().filter(turn -> !turn.isSkipped()).toList();

        RubricAverages rubric = attempted.isEmpty() ? null : new RubricAverages(
                average(attempted, InterviewTurn::getSubstance),
                average(attempted, InterviewTurn::getClarity),
                average(attempted, InterviewTurn::getDepth));

        List<InterviewTurn> spoken = attempted.stream().filter(turn -> turn.wpm() != null).toList();
        Integer avgWpm = spoken.isEmpty() ? null : (int) Math.round(
                sum(spoken, InterviewTurn::getWordCount) / (sum(spoken, InterviewTurn::getSpeakingSeconds) / 60.0));
        int fillers = sum(answered, InterviewTurn::getFillerCount);
        SpeechSummary speech = new SpeechSummary(avgWpm, fillers, sum(answered, InterviewTurn::getWordCount),
                sum(answered, InterviewTurn::getSpeakingSeconds));

        Double overall = overallScore(turns);
        Integer delta = interview.confidenceDelta();

        return new ScorecardResponse(
                interview.getId(),
                interview.getTrack(),
                interview.getPersona(),
                interview.getStatus(),
                interview.getHeadline(),
                interview.getRole(),
                interview.getTopic(),
                interview.getProjectName(),
                interview.isDrill(),
                interview.getSourceInterviewId(),
                interview.getQuestionCount(),
                interview.getAnsweredCount(),
                interview.isEndedEarly(),
                interview.getPreConfidence(),
                interview.getPostConfidence(),
                delta,
                interview.getReflection(),
                overall,
                band(overall),
                rubric,
                speech,
                highlights(turns, attempted, rubric, spoken, avgWpm, fillers, delta),
                focusAreas(turns, answered, rubric, avgWpm, fillers, delta),
                turns.stream().map(this::review).toList(),
                interview.getOwner() != null,
                interview.getEngine(),
                interview.getCreatedAt(),
                interview.getFinishedAt());
    }

    public EvaluationView evaluationView(InterviewTurn turn) {
        return new EvaluationView(
                turn.getTurnIndex(),
                valueOrZero(turn.getScore()),
                rubricScores(turn),
                turn.getFeedback(),
                turn.getTip(),
                turn.outlineItems(),
                turn.isSkipped(),
                turn.isHintUsed(),
                turn.getEvaluatedBy(),
                valueOrZero(turn.getWordCount()),
                valueOrZero(turn.getFillerCount()),
                turn.wpm());
    }

    public InterviewSummary summary(Interview interview) {
        return new InterviewSummary(
                interview.getId(),
                interview.getTrack(),
                interview.getPersona(),
                interview.getStatus(),
                interview.getHeadline(),
                interview.getOverallScore(),
                interview.confidenceDelta(),
                interview.getAnsweredCount(),
                interview.getQuestionCount(),
                interview.isDrill(),
                interview.getCreatedAt());
    }

    String band(Double overall) {
        if (overall == null) {
            return "Not scored yet";
        }
        return copy.bands().stream()
                .sorted(Comparator.comparingDouble(BankModel.Band::min).reversed())
                .filter(band -> overall >= band.min())
                .map(BankModel.Band::label)
                .findFirst()
                .orElse("Needs more reps");
    }

    private TurnReview review(InterviewTurn turn) {
        return new TurnReview(
                turn.getTurnIndex(),
                turn.getRound(),
                turn.getTier(),
                turn.getQuestion(),
                turn.isAnswered(),
                turn.getAnswer(),
                turn.isSkipped(),
                turn.isHintUsed(),
                turn.getHint(),
                turn.getScore(),
                turn.isAnswered() ? rubricScores(turn) : null,
                turn.getFeedback(),
                turn.getTip(),
                turn.outlineItems(),
                turn.getEvaluatedBy(),
                turn.getWordCount(),
                turn.getFillerCount(),
                turn.getSpeakingSeconds(),
                turn.getDurationSeconds(),
                turn.getInputMode(),
                turn.wpm());
    }

    private List<String> highlights(List<InterviewTurn> turns, List<InterviewTurn> attempted, RubricAverages rubric,
                                    List<InterviewTurn> spoken, Integer avgWpm, int fillers, Integer delta) {
        BankModel.Highlights text = copy.highlights();
        List<String> notes = new ArrayList<>();

        InterviewTurn best = null;
        for (InterviewTurn turn : attempted) {
            if (turn.getScore() != null && (best == null || turn.getScore() > best.getScore())) {
                best = turn;
            }
        }
        if (best != null && best.getScore() >= 7) {
            notes.add(Text.fill(text.bestAnswer(), Map.of(
                    "index", String.valueOf(best.getTurnIndex()), "score", String.valueOf(best.getScore()))));
        }
        if (rubric != null) {
            String strongest = strongest(rubric);
            if (value(rubric, strongest) >= 6.5) {
                notes.add(text.strength().get(strongest));
            }
        }
        if (avgWpm != null && avgWpm >= 110 && avgWpm <= 165) {
            notes.add(Text.fill(text.pace(), Map.of("wpm", String.valueOf(avgWpm))));
        }
        if (!spoken.isEmpty() && fillers == 0) {
            notes.add(text.noFillers());
        }
        if (delta != null && delta > 0) {
            notes.add(Text.fill(text.confidenceUp(), Map.of("delta", String.valueOf(delta))));
        }
        if (notes.isEmpty()) {
            notes.add(copy.empty().highlight());
        }
        return List.copyOf(notes.subList(0, Math.min(MAX_NOTES, notes.size())));
    }

    private List<String> focusAreas(List<InterviewTurn> turns, List<InterviewTurn> answered, RubricAverages rubric,
                                    Integer avgWpm, int fillers, Integer delta) {
        BankModel.Focus text = copy.focus();
        List<String> notes = new ArrayList<>();

        if (rubric != null) {
            String weakest = weakest(rubric);
            if (value(rubric, weakest) < 7.5) {
                notes.add(text.weakness().get(weakest));
            }
        }
        if (avgWpm != null) {
            if (avgWpm > 165) {
                notes.add(Text.fill(text.fast(), Map.of("wpm", String.valueOf(avgWpm))));
            } else if (avgWpm < 110) {
                notes.add(Text.fill(text.slow(), Map.of("wpm", String.valueOf(avgWpm))));
            }
        }
        if (!answered.isEmpty() && fillers / (double) answered.size() >= 2) {
            notes.add(Text.fill(text.fillers(), Map.of("fillers", String.valueOf(fillers))));
        }
        long skipped = answered.stream().filter(InterviewTurn::isSkipped).count();
        if (skipped > 0) {
            notes.add(Text.fill(text.skipped(), Map.of("count", String.valueOf(skipped))));
        }
        long hints = turns.stream().filter(InterviewTurn::isHintUsed).count();
        if (hints > 0) {
            notes.add(Text.fill(text.hints(), Map.of("count", String.valueOf(hints))));
        }
        if (delta != null && delta < 0) {
            notes.add(text.confidenceDown());
        }
        if (notes.isEmpty()) {
            notes.add(copy.empty().focus());
        }
        return List.copyOf(notes.subList(0, Math.min(MAX_NOTES, notes.size())));
    }

    private static String strongest(RubricAverages rubric) {
        String best = "substance";
        if (rubric.clarity() > value(rubric, best)) {
            best = "clarity";
        }
        if (rubric.depth() > value(rubric, best)) {
            best = "depth";
        }
        return best;
    }

    private static String weakest(RubricAverages rubric) {
        String worst = "substance";
        if (rubric.clarity() < value(rubric, worst)) {
            worst = "clarity";
        }
        if (rubric.depth() < value(rubric, worst)) {
            worst = "depth";
        }
        return worst;
    }

    private static double value(RubricAverages rubric, String dimension) {
        return switch (dimension) {
            case "clarity" -> rubric.clarity();
            case "depth" -> rubric.depth();
            default -> rubric.substance();
        };
    }

    private static RubricScores rubricScores(InterviewTurn turn) {
        return new RubricScores(valueOrZero(turn.getSubstance()), valueOrZero(turn.getClarity()),
                valueOrZero(turn.getDepth()));
    }

    private static Double average(List<InterviewTurn> turns, Function<InterviewTurn, Integer> field) {
        return round1(turns.stream().map(field).filter(Objects::nonNull).mapToInt(Integer::intValue).average()
                .orElse(0));
    }

    private static int sum(List<InterviewTurn> turns, Function<InterviewTurn, Integer> field) {
        return turns.stream().map(field).filter(Objects::nonNull).mapToInt(Integer::intValue).sum();
    }

    private static int valueOrZero(Integer value) {
        return value == null ? 0 : value;
    }

    static double round1(double value) {
        return Math.round(value * 10) / 10.0;
    }
}
