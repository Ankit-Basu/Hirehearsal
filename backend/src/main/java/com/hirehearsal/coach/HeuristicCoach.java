package com.hirehearsal.coach;

import com.hirehearsal.coach.BankModel.Coach;
import com.hirehearsal.coach.CoachTypes.AnswerSignals;
import com.hirehearsal.coach.CoachTypes.Evaluation;
import com.hirehearsal.interview.Persona;
import com.hirehearsal.interview.Round;
import com.hirehearsal.interview.Tier;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * The offline interviewer: transparent, rule-based scoring used whenever the LLM is unavailable. The same rules
 * run in the browser for guests without a backend ({@code src/lib/engine/coach.ts}).
 */
@Component
public class HeuristicCoach {

    enum Dimension {
        SUBSTANCE("substance"), CLARITY("clarity"), DEPTH("depth");

        final String key;

        Dimension(String key) {
            this.key = key;
        }
    }

    private final Coach copy;
    private final Map<String, List<String>> hints;
    private final AnswerAnalyzer analyzer;

    public HeuristicCoach(QuestionBank bank, AnswerAnalyzer analyzer) {
        this.copy = bank.model().coach();
        this.hints = bank.model().hints();
        this.analyzer = analyzer;
    }

    public Evaluation evaluate(Round round, Persona persona, String question, String answer,
                               boolean skipped, boolean hintUsed) {
        AnswerSignals signals = analyzer.analyze(question, answer, round);
        List<String> outline = outline(round, signals.keywords());
        Map<String, String> tone = copy.tone().get(persona.bankKey());

        if (skipped || signals.words() == 0) {
            return new Evaluation(0, 0, 0, 0, tone.get("skipped"), copy.tips().get("skipped"), outline,
                    "heuristic", signals.words(), signals.fillers());
        }

        double substance = substance(signals, round);
        double clarity = clarity(signals);
        double depth = depth(signals, round);
        double raw = 0.4 * substance + 0.3 * clarity + 0.3 * depth + persona.leniency() - (hintUsed ? 1 : 0);

        int score = clamp((int) Math.round(raw), 1, 10);
        int sub = clamp((int) Math.round(substance), 0, 10);
        int cla = clamp((int) Math.round(clarity), 0, 10);
        int dep = clamp((int) Math.round(depth), 0, 10);

        String band = band(score);
        Dimension weakest = weakest(sub, cla, dep);
        String observation = band.equals("excellent") || band.equals("good")
                ? copy.strength().get(strongest(sub, cla, dep).key)
                : copy.weakness().get(weakest.key);
        String feedback = tone.get(band) + " " + observation;
        String tip = tip(signals, round, sub, cla, dep, weakest);

        return new Evaluation(score, sub, cla, dep, feedback, tip, outline, "heuristic", signals.words(),
                signals.fillers());
    }

    static double substance(AnswerSignals s, Round round) {
        int w = s.words();
        double lengthPoints = w < 5 ? 1 : w < 15 ? 3 : w < 30 ? 5 : w < 60 ? 7 : w <= 180 ? 8.5 : w <= 260 ? 8 : 7;
        double overlapPoints = 3 + 7 * Math.min(1, s.overlap() * 1.4);
        double value = round == Round.HR
                ? 0.6 * lengthPoints + 0.4 * overlapPoints
                : 0.5 * lengthPoints + 0.5 * overlapPoints;
        return clamp(value, 0, 10);
    }

    static double clarity(AnswerSignals s) {
        double value = 8;
        if (s.words() < 15) {
            value -= 3;
        }
        // Speech transcripts rarely carry punctuation, so sentence length is only judged for typed answers.
        if (s.hasPunctuation()) {
            if (s.avgSentenceLength() > 40) {
                value -= 2;
            } else if (s.avgSentenceLength() > 28) {
                value -= 1;
            }
        }
        value -= Math.min(3, (s.fillers() / (double) Math.max(s.words(), 1)) * 60);
        if (s.signposts() >= 2) {
            value += 1;
        }
        if (s.words() > 260) {
            value -= 1;
        }
        return clamp(value, 0, 10);
    }

    static double depth(AnswerSignals s, Round round) {
        double value = 2.5
                + Math.min(s.connectors(), 4) * 1.1
                + Math.min(s.examples(), 2) * 1.2
                + (s.words() >= 60 ? 1 : 0)
                + (s.quantified() ? 0.6 : 0);
        if (round == Round.HR) {
            value += s.star() * 0.9;
        }
        return clamp(value, 0, 10);
    }

    static String band(int score) {
        if (score >= 8) {
            return "excellent";
        }
        if (score >= 6) {
            return "good";
        }
        if (score >= 4) {
            return "fair";
        }
        return "weak";
    }

    private String tip(AnswerSignals s, Round round, int sub, int cla, int dep, Dimension weakest) {
        Map<String, String> tips = copy.tips();
        if (Math.min(sub, Math.min(cla, dep)) >= 8) {
            return tips.get("polish");
        }
        if (s.words() > 260) {
            return tips.get("rambling");
        }
        return switch (weakest) {
            case SUBSTANCE -> s.words() < 25 || s.keywords().isEmpty()
                    ? tips.get("tooShort")
                    : Text.fill(tips.get("offTopic"), Map.of("keywords", joinKeywords(s.keywords())));
            case CLARITY -> {
                if (s.fillers() >= 3) {
                    yield Text.fill(tips.get("fillers"), Map.of("fillers", String.valueOf(s.fillers())));
                }
                yield s.hasPunctuation() && s.avgSentenceLength() > 28
                        ? tips.get("longSentences")
                        : tips.get("signpost");
            }
            case DEPTH -> switch (round) {
                case HR -> tips.get("depthHr");
                case PROJECT -> tips.get("depthProject");
                case TECHNICAL -> tips.get("depthTechnical");
            };
        };
    }

    public List<String> outline(Round round, List<String> keywords) {
        BankModel.Outlines outlines = copy.outlines();
        return switch (round) {
            case TECHNICAL -> {
                List<String> items = new ArrayList<>();
                items.add(keywords.isEmpty()
                        ? outlines.lead()
                        : Text.fill(outlines.leadWithKeywords(), Map.of("keywords", joinKeywords(keywords))));
                items.addAll(outlines.technical());
                yield List.copyOf(items);
            }
            case PROJECT -> outlines.project();
            case HR -> outlines.hr();
        };
    }

    public String hint(Round round, String question) {
        List<String> nudges = hints.get(round.bankKey());
        String nudge = nudges.get(Math.floorMod(Text.hash(question), nudges.size()));
        List<String> keywords = analyzer.keywords(question);
        if (keywords.isEmpty()) {
            return nudge;
        }
        return Text.fill(copy.hintPrefix(), Map.of("keywords", joinKeywords(keywords))) + " " + nudge;
    }

    public String opener(InterviewBrief brief, Map<String, String> placeholders) {
        String subject = Text.fill(copy.subjects().get(brief.track().json()), placeholders);
        return Text.fill(copy.openers().get(brief.persona().bankKey()),
                Map.of("count", String.valueOf(brief.questionCount()), "subject", subject));
    }

    public Tier startTier(Persona persona, Round round) {
        return round == Round.HR || persona == Persona.MENTOR ? Tier.FOUNDATION : Tier.CORE;
    }

    public Tier nextTier(Persona persona, Tier current, int score) {
        if (score >= persona.levelUpAt()) {
            return current.up();
        }
        if (score <= persona.levelDownAt()) {
            return current.down();
        }
        return current;
    }

    static Dimension strongest(int sub, int cla, int dep) {
        Dimension best = Dimension.SUBSTANCE;
        int bestValue = sub;
        if (cla > bestValue) {
            best = Dimension.CLARITY;
            bestValue = cla;
        }
        if (dep > bestValue) {
            best = Dimension.DEPTH;
        }
        return best;
    }

    static Dimension weakest(int sub, int cla, int dep) {
        Dimension worst = Dimension.SUBSTANCE;
        int worstValue = sub;
        if (cla < worstValue) {
            worst = Dimension.CLARITY;
            worstValue = cla;
        }
        if (dep < worstValue) {
            worst = Dimension.DEPTH;
        }
        return worst;
    }

    private static String joinKeywords(List<String> keywords) {
        return String.join(", ", keywords.subList(0, Math.min(3, keywords.size())));
    }

    private static int clamp(int value, int min, int max) {
        return Math.max(min, Math.min(max, value));
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
