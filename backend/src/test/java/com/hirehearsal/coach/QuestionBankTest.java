package com.hirehearsal.coach;

import static org.assertj.core.api.Assertions.assertThat;

import com.hirehearsal.coach.BankModel.Topic;
import com.hirehearsal.coach.CoachTypes.QuestionDraft;
import com.hirehearsal.interview.Persona;
import com.hirehearsal.interview.Round;
import com.hirehearsal.interview.Tier;
import com.hirehearsal.interview.Track;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.junit.jupiter.api.Test;

class QuestionBankTest {

    private final QuestionBank bank = QuestionBank.load();

    private static InterviewBrief brief(Track track, String role, String topic, String project, String jd) {
        return new InterviewBrief(track, Persona.PANELIST, role, topic, project, null, jd, 5);
    }

    @Test
    void resolvesTopicFromFreeText() {
        List<Topic> topics = bank.resolveTopics(brief(Track.TECHNICAL, null, "DBMS normalization", null, null));

        assertThat(topics).isNotEmpty();
        assertThat(topics.get(0).id()).isEqualTo("dbms");
    }

    @Test
    void fallsBackToJobDescriptionSkills() {
        List<Topic> topics = bank.resolveTopics(brief(Track.TECHNICAL, null, null, null,
                "We build React front ends on a Node.js API backed by PostgreSQL."));

        assertThat(topics).extracting(Topic::id).contains("web", "dbms");
    }

    @Test
    void neverRepeatsQuestionsAcrossAWholeInterview() {
        InterviewBrief brief = brief(Track.TECHNICAL, null, "Operating Systems", null, null);
        List<String> asked = new ArrayList<>();
        for (int index = 1; index <= 8; index++) {
            QuestionDraft draft = bank.pick(Round.TECHNICAL, brief, Tier.CORE, index, asked, 42);
            asked.add(draft.question());
        }

        assertThat(new HashSet<>(asked)).hasSize(8);
    }

    @Test
    void fillsProjectAndRolePlaceholders() {
        InterviewBrief brief = brief(Track.MIXED, "SDE Intern", "Java", "Hirehearsal", null);

        String project = bank.pick(Round.PROJECT, brief, Tier.CORE, 4, List.of(), 7).question();
        String hr = bank.pick(Round.HR, brief, Tier.FOUNDATION, 1, List.of(), 7).question();

        assertThat(project).contains("Hirehearsal").doesNotContain("{");
        assertThat(hr).startsWith("Tell me about yourself").contains("SDE Intern");
    }

    @Test
    void unknownTopicsUseGenericQuestions() {
        InterviewBrief brief = brief(Track.TECHNICAL, null, "Quantum Basket Weaving", null, null);

        QuestionDraft draft = bank.pick(Round.TECHNICAL, brief, Tier.FOUNDATION, 1, List.of(), 3);

        assertThat(draft.question()).contains("Quantum Basket Weaving");
        assertThat(draft.source()).isEqualTo("bank");
    }
}
