package com.hirehearsal.progress;

import com.hirehearsal.interview.Interview;
import com.hirehearsal.interview.InterviewRepository;
import com.hirehearsal.interview.InterviewTurn;
import com.hirehearsal.interview.InterviewTurnRepository;
import com.hirehearsal.interview.Round;
import com.hirehearsal.interview.ScorecardAssembler;
import com.hirehearsal.interview.dto.InterviewResponses.RubricAverages;
import com.hirehearsal.progress.ProgressResponse.Totals;
import com.hirehearsal.progress.ProgressResponse.TrendPoint;
import com.hirehearsal.progress.ProgressResponse.WeeklyGoal;
import com.hirehearsal.user.AppUser;
import com.hirehearsal.user.UserService;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProgressService {

    private static final int READINESS_WINDOW = 5;

    private final InterviewRepository interviews;
    private final InterviewTurnRepository turns;
    private final UserService users;
    private final ScorecardAssembler assembler;
    private final Clock clock;

    public ProgressService(InterviewRepository interviews, InterviewTurnRepository turns, UserService users,
                           ScorecardAssembler assembler, Clock clock) {
        this.interviews = interviews;
        this.turns = turns;
        this.users = users;
        this.assembler = assembler;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public ProgressResponse progress(String userId, ZoneId zone) {
        AppUser user = users.require(userId);
        List<Interview> answered = interviews.findAnsweredByOwner(userId, PageRequest.of(0, 120));

        List<Double> recentScores = answered.stream()
                .map(Interview::getOverallScore)
                .filter(Objects::nonNull)
                .limit(READINESS_WINDOW)
                .toList();

        List<InterviewTurn> recentTurns = turns.findAnsweredByOwnerSince(userId,
                clock.instant().minus(Duration.ofDays(30)));
        Map<String, Integer> byRound = new LinkedHashMap<>();
        for (Round round : Round.values()) {
            OptionalDouble average = recentTurns.stream()
                    .filter(turn -> turn.getRound() == round && turn.getScore() != null)
                    .mapToInt(InterviewTurn::getScore)
                    .average();
            byRound.put(round.json(), average.isPresent() ? (int) Math.round(average.getAsDouble() * 10) : null);
        }

        List<InterviewTurn> attempted = recentTurns.stream().filter(turn -> !turn.isSkipped()).toList();
        RubricAverages rubric = attempted.isEmpty() ? null : new RubricAverages(
                average(attempted, InterviewTurn::getSubstance),
                average(attempted, InterviewTurn::getClarity),
                average(attempted, InterviewTurn::getDepth));

        LocalDate today = LocalDate.now(clock.withZone(zone));
        Set<LocalDate> activeDays = answered.stream()
                .map(interview -> LocalDate.ofInstant(interview.getCreatedAt(), zone))
                .collect(Collectors.toSet());
        LocalDate weekStart = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        int thisWeek = (int) answered.stream()
                .filter(interview -> !LocalDate.ofInstant(interview.getCreatedAt(), zone).isBefore(weekStart))
                .count();

        Long answers = interviews.sumAnsweredByOwner(userId);
        Long seconds = turns.sumSpeakingSecondsByOwner(userId);

        List<TrendPoint> trend = new ArrayList<>(answered.stream()
                .filter(interview -> interview.getOverallScore() != null)
                .limit(10)
                .map(interview -> new TrendPoint(interview.getId(), interview.getCreatedAt(),
                        interview.getOverallScore(), interview.getTrack()))
                .toList());
        Collections.reverse(trend);

        return new ProgressResponse(
                readiness(recentScores),
                byRound,
                streak(activeDays, today),
                activeDays.contains(today),
                new WeeklyGoal(user.getWeeklyGoal(), thisWeek),
                new Totals(interviews.countByOwnerId(userId), answers == null ? 0 : answers,
                        (int) ((seconds == null ? 0 : seconds) / 60)),
                trend,
                rubric,
                answered.stream().limit(5).map(assembler::summary).toList());
    }

    /** Weighted 5-4-3-2-1 towards the newest scores, scaled to 0-100. */
    static int readiness(List<Double> scoresNewestFirst) {
        if (scoresNewestFirst.isEmpty()) {
            return 0;
        }
        double weighted = 0;
        double weights = 0;
        for (int i = 0; i < scoresNewestFirst.size(); i++) {
            int weight = READINESS_WINDOW - i;
            weighted += scoresNewestFirst.get(i) * weight;
            weights += weight;
        }
        return (int) Math.round(weighted / weights * 10);
    }

    /** Consecutive practice days ending today, or ending yesterday if the candidate hasn't practiced yet today. */
    static int streak(Set<LocalDate> activeDays, LocalDate today) {
        LocalDate cursor = activeDays.contains(today) ? today : today.minusDays(1);
        int streak = 0;
        while (activeDays.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private static Double average(List<InterviewTurn> list, Function<InterviewTurn, Integer> field) {
        OptionalDouble average = list.stream().map(field).filter(Objects::nonNull).mapToInt(Integer::intValue)
                .average();
        return average.isPresent() ? Math.round(average.getAsDouble() * 10) / 10.0 : null;
    }
}
