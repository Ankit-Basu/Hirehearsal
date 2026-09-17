package com.hirehearsal.insights;

import com.hirehearsal.coach.BankModel.Topic;
import com.hirehearsal.coach.InterviewBrief;
import com.hirehearsal.coach.QuestionBank;
import com.hirehearsal.insights.InsightsResponse.Averages;
import com.hirehearsal.insights.InsightsResponse.DailyActivity;
import com.hirehearsal.insights.InsightsResponse.FocusArea;
import com.hirehearsal.insights.InsightsResponse.Totals;
import com.hirehearsal.interview.Interview;
import com.hirehearsal.interview.InterviewRepository;
import com.hirehearsal.interview.InterviewStatus;
import com.hirehearsal.interview.InterviewTurnRepository;
import com.hirehearsal.interview.Persona;
import com.hirehearsal.interview.Track;
import com.hirehearsal.interview.dto.InterviewResponses.RubricAverages;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.OptionalDouble;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InsightsService {

    private static final int ACTIVITY_DAYS = 14;
    private static final int FOCUS_SAMPLE = 500;

    private final InterviewRepository interviews;
    private final InterviewTurnRepository turns;
    private final QuestionBank bank;
    private final Clock clock;

    public InsightsService(InterviewRepository interviews, InterviewTurnRepository turns, QuestionBank bank,
                           Clock clock) {
        this.interviews = interviews;
        this.turns = turns;
        this.bank = bank;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public InsightsResponse insights() {
        long total = interviews.count();
        long finished = interviews.countByStatus(InterviewStatus.FINISHED);
        int completionRate = total == 0 ? 0 : (int) Math.round(finished * 100.0 / total);

        Object[] rubricRow = firstRow(turns.rubricAverages());
        RubricAverages rubric = rubricRow == null || rubricRow[0] == null ? null
                : new RubricAverages(round1(rubricRow[0]), round1(rubricRow[1]), round1(rubricRow[2]));

        Object[] spoken = firstRow(turns.spokenTotals());
        Integer wpm = null;
        if (spoken != null && spoken[0] != null && spoken[1] != null) {
            long words = ((Number) spoken[0]).longValue();
            long seconds = ((Number) spoken[1]).longValue();
            if (seconds > 0) {
                wpm = (int) Math.round(words / (seconds / 60.0));
            }
        }

        Averages averages = new Averages(
                round1(interviews.averageScore()),
                round1(interviews.averagePreConfidence()),
                round1(interviews.averagePostConfidence()),
                round1(interviews.averageConfidenceDelta()),
                wpm,
                round1(turns.averageFillers()));

        return new InsightsResponse(
                new Totals(total, finished, completionRate, turns.countByAnsweredTrue()),
                averages,
                rubric,
                counts(Track.values(), interviews.countByTrack(), Track::json),
                counts(Persona.values(), interviews.countByPersona(), Persona::json),
                popularFocusAreas(),
                dailyActivity(),
                clock.instant());
    }

    /** Maps free-text topics and job descriptions onto the bank's curated topics, so no raw user text leaks. */
    private List<FocusArea> popularFocusAreas() {
        List<Interview> sample = interviews.findAll(
                PageRequest.of(0, FOCUS_SAMPLE, Sort.by(Sort.Direction.DESC, "createdAt"))).getContent();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (Interview interview : sample) {
            if (interview.getTrack() != Track.TECHNICAL && interview.getTrack() != Track.MIXED) {
                continue;
            }
            InterviewBrief brief = new InterviewBrief(interview.getTrack(), interview.getPersona(), null,
                    interview.getTopic(), null, null, interview.getJobDescription(), interview.getQuestionCount());
            List<Topic> topics = bank.resolveTopics(brief);
            if (!topics.isEmpty()) {
                counts.merge(topics.get(0).label(), 1L, Long::sum);
            }
        }
        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(6)
                .map(entry -> new FocusArea(entry.getKey(), entry.getValue()))
                .toList();
    }

    private List<DailyActivity> dailyActivity() {
        LocalDate today = LocalDate.now(clock.withZone(ZoneOffset.UTC));
        LocalDate first = today.minusDays(ACTIVITY_DAYS - 1);
        Map<LocalDate, List<Interview>> byDay = interviews
                .findByCreatedAtGreaterThanEqual(first.atStartOfDay(ZoneOffset.UTC).toInstant())
                .stream()
                .collect(Collectors.groupingBy(interview -> LocalDate.ofInstant(interview.getCreatedAt(),
                        ZoneOffset.UTC)));

        List<DailyActivity> days = new ArrayList<>();
        for (LocalDate day = first; !day.isAfter(today); day = day.plusDays(1)) {
            List<Interview> onDay = byDay.getOrDefault(day, List.of());
            OptionalDouble average = onDay.stream().map(Interview::getOverallScore).filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue).average();
            days.add(new DailyActivity(day, onDay.size(),
                    average.isPresent() ? round1(average.getAsDouble()) : null));
        }
        return days;
    }

    private static <E extends Enum<E>> Map<String, Long> counts(E[] values, List<Object[]> rows,
                                                                Function<E, String> key) {
        Map<String, Long> result = new LinkedHashMap<>();
        for (E value : values) {
            result.put(key.apply(value), 0L);
        }
        for (Object[] row : rows) {
            @SuppressWarnings("unchecked")
            E value = (E) row[0];
            result.put(key.apply(value), ((Number) row[1]).longValue());
        }
        return result;
    }

    private static Object[] firstRow(List<Object[]> rows) {
        return rows == null || rows.isEmpty() ? null : rows.get(0);
    }

    private static Double round1(Object value) {
        if (!(value instanceof Number number)) {
            return null;
        }
        return Math.round(number.doubleValue() * 10) / 10.0;
    }
}
