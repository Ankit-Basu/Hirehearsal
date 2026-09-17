package com.hirehearsal.interview;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Decides which round each question belongs to. A full interview loop opens and closes with HR questions and
 * spends the middle on technical and project questions, like a real loop.
 */
public final class RoundPlanner {

    /** H = HR, T = technical, P = project (or technical when the candidate has no project). */
    private static final Map<Integer, String> MIXED_PATTERNS = Map.of(
            3, "HTP",
            4, "HTTP",
            5, "HTTPH",
            6, "HTTPPH",
            7, "HTTTPPH",
            8, "HTTTPPTH");

    private RoundPlanner() {
    }

    public static List<Round> plan(Track track, int questionCount, boolean hasProject) {
        return switch (track) {
            case TECHNICAL -> Collections.nCopies(questionCount, Round.TECHNICAL);
            case PROJECT -> Collections.nCopies(questionCount, Round.PROJECT);
            case HR -> Collections.nCopies(questionCount, Round.HR);
            case MIXED -> {
                String pattern = MIXED_PATTERNS.get(questionCount);
                if (pattern == null) {
                    throw new IllegalArgumentException("A full loop needs 3 to 8 questions, got " + questionCount);
                }
                yield pattern.chars()
                        .mapToObj(symbol -> switch (symbol) {
                            case 'H' -> Round.HR;
                            case 'T' -> Round.TECHNICAL;
                            default -> hasProject ? Round.PROJECT : Round.TECHNICAL;
                        })
                        .toList();
            }
        };
    }

    public static Round defaultRound(Track track) {
        return switch (track) {
            case PROJECT -> Round.PROJECT;
            case HR -> Round.HR;
            case TECHNICAL, MIXED -> Round.TECHNICAL;
        };
    }
}
