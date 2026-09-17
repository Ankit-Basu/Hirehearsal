package com.hirehearsal.coach;

import static org.assertj.core.api.Assertions.assertThat;

import com.hirehearsal.coach.CoachTypes.LlmEvaluation;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class LlmReplyParserTest {

    private final LlmReplyParser parser = new LlmReplyParser(JsonMapper.shared());

    @Test
    void parsesJsonWrappedInProseAndFences() {
        String raw = """
                Sure! Here is the evaluation:
                ```json
                {"score": 8, "rubric": {"substance": 8, "clarity": 7, "depth": 9},
                 "feedback": "Clear and specific.", "tip": "Add a metric.",
                 "outline": ["Define it", "Explain it", "Example", "Trade-off", "Extra"],
                 "nextQuestion": "How would you shard it?"}
                ```""";

        Optional<LlmEvaluation> evaluation = parser.evaluation(raw);

        assertThat(evaluation).isPresent();
        assertThat(evaluation.get().score()).isEqualTo(8);
        assertThat(evaluation.get().outline()).hasSize(4);
        assertThat(evaluation.get().nextQuestion()).isEqualTo("How would you shard it?");
    }

    @Test
    void clampsOutOfRangeAndStringScores() {
        String raw = """
                {"score": "12", "rubric": {"substance": -3, "clarity": 7.6, "depth": "5"},
                 "feedback": "Okay.", "nextQuestion": null}""";

        LlmEvaluation evaluation = parser.evaluation(raw).orElseThrow();

        assertThat(evaluation.score()).isEqualTo(10);
        assertThat(evaluation.substance()).isZero();
        assertThat(evaluation.clarity()).isEqualTo(8);
        assertThat(evaluation.depth()).isEqualTo(5);
        assertThat(evaluation.nextQuestion()).isNull();
    }

    @Test
    void stripsEchoedQuestionLabels() {
        assertThat(LlmReplyParser.stripLabel("Question 2 of 3 (Technical): Explain ACID.")).isEqualTo("Explain ACID.");
        assertThat(LlmReplyParser.stripLabel("Q3: What is a deadlock?")).isEqualTo("What is a deadlock?");
        assertThat(LlmReplyParser.stripLabel("Questions about scaling are next?"))
                .isEqualTo("Questions about scaling are next?");
    }

    @Test
    void rejectsIncompleteOrInvalidReplies() {
        assertThat(parser.evaluation("{\"score\": 7, \"rubric\": {\"substance\": 7}}")).isEmpty();
        assertThat(parser.evaluation("not json at all")).isEmpty();
        assertThat(parser.question("{\"question\": \"   \"}")).isEmpty();
        assertThat(parser.question("{\"question\": \"What is ACID?\"}")).contains("What is ACID?");
    }
}
