package com.hirehearsal.coach;

import com.hirehearsal.coach.BankModel.BankFile;
import com.hirehearsal.coach.BankModel.TierSet;
import com.hirehearsal.coach.BankModel.Topic;
import com.hirehearsal.coach.CoachTypes.QuestionDraft;
import com.hirehearsal.interview.Round;
import com.hirehearsal.interview.Tier;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

/**
 * The curated question bank shared with the web app. It resolves technical topics from free text or a job
 * description and picks unused questions at the right difficulty.
 */
@Component
public class QuestionBank {

    static final String RESOURCE = "bank/question-bank.json";
    private static final String FALLBACK_QUESTION =
            "What else should an interviewer know about your experience with {topic}?";

    private final BankFile model;

    public QuestionBank(ObjectMapper mapper) {
        try (InputStream in = new ClassPathResource(RESOURCE).getInputStream()) {
            this.model = mapper.readValue(in, BankFile.class);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not load the question bank from " + RESOURCE, ex);
        }
    }

    /** Loads the bank without a Spring context, for unit tests. */
    public static QuestionBank load() {
        return new QuestionBank(JsonMapper.shared());
    }

    public BankFile model() {
        return model;
    }

    /** Topics matched from the explicit topic first, falling back to the job description. Best match first. */
    public List<Topic> resolveTopics(InterviewBrief brief) {
        List<Topic> fromTopic = rank(Text.normalize(brief.topic()));
        if (!fromTopic.isEmpty()) {
            return fromTopic;
        }
        return rank(Text.normalize(brief.jobDescription()));
    }

    List<Topic> rank(String normalized) {
        record Scored(Topic topic, long score, int order) {
        }
        List<Topic> topics = model.technical().topics();
        List<Scored> scored = new ArrayList<>();
        for (int i = 0; i < topics.size(); i++) {
            Topic topic = topics.get(i);
            long score = topic.keywords().stream().filter(k -> Text.matchesKeyword(normalized, k)).count();
            if (score > 0) {
                scored.add(new Scored(topic, score, i));
            }
        }
        scored.sort(Comparator.comparingLong(Scored::score).reversed().thenComparingInt(Scored::order));
        return scored.stream().map(Scored::topic).toList();
    }

    public String topicLabel(InterviewBrief brief) {
        if (brief.hasTopic()) {
            return brief.topic().trim();
        }
        List<Topic> resolved = resolveTopics(brief);
        return resolved.isEmpty() ? "your target skills" : resolved.get(0).label();
    }

    public Map<String, String> placeholders(InterviewBrief brief) {
        return Map.of(
                "topic", topicLabel(brief),
                "project", brief.hasProject() ? brief.projectName().trim() : "your project",
                "role", brief.hasRole() ? brief.role().trim() : "software engineer");
    }

    /**
     * Picks the first unused question for the round, trying the preferred tier first. Technical rounds rotate
     * through every matched topic before falling back to generic questions.
     */
    public QuestionDraft pick(Round round, InterviewBrief brief, Tier tier, int turnIndex,
                              Collection<String> askedQuestions, int seed) {
        Set<String> asked = askedQuestions.stream().map(Text::normalize).collect(Collectors.toSet());
        Map<String, String> values = placeholders(brief);

        List<TierSet> pools = new ArrayList<>();
        switch (round) {
            case TECHNICAL -> {
                List<Topic> topics = resolveTopics(brief);
                if (!topics.isEmpty()) {
                    int start = Math.floorMod(turnIndex - 1, topics.size());
                    for (int i = 0; i < topics.size(); i++) {
                        pools.add(topics.get((start + i) % topics.size()).questions());
                    }
                }
                pools.add(model.technical().generic());
            }
            case PROJECT -> pools.add(model.project());
            case HR -> pools.add(model.hr());
        }

        for (TierSet pool : pools) {
            for (Tier candidateTier : tier.searchOrder()) {
                List<String> questions = pool.get(candidateTier);
                if (questions.isEmpty()) {
                    continue;
                }
                // The classic "tell me about yourself" opener leads an interview that starts with HR.
                int start = round == Round.HR && turnIndex == 1 ? 0 : Math.floorMod(seed, questions.size());
                for (int k = 0; k < questions.size(); k++) {
                    String question = Text.fill(questions.get((start + k) % questions.size()), values);
                    if (!asked.contains(Text.normalize(question))) {
                        return new QuestionDraft(question, candidateTier, "bank");
                    }
                }
            }
        }
        return new QuestionDraft(Text.fill(FALLBACK_QUESTION, values), tier, "bank");
    }
}
