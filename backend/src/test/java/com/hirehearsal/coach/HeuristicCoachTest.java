package com.hirehearsal.coach;

import static org.assertj.core.api.Assertions.assertThat;

import com.hirehearsal.coach.CoachTypes.Evaluation;
import com.hirehearsal.interview.Persona;
import com.hirehearsal.interview.Round;
import com.hirehearsal.interview.Tier;
import org.junit.jupiter.api.Test;

class HeuristicCoachTest {

    private static final QuestionBank BANK = QuestionBank.load();
    private static final AnswerAnalyzer ANALYZER = new AnswerAnalyzer(BANK);
    private final HeuristicCoach coach = new HeuristicCoach(BANK, ANALYZER);

    private static final String QUESTION = "How does an index speed up reads, and what does it cost you on writes?";
    private static final String STRONG_ANSWER = """
            An index is a separate data structure, usually a B+ tree, that keeps column values sorted with pointers \
            to rows. Because the database can binary search the tree instead of scanning every row, reads drop from \
            linear time to logarithmic time. For example, looking up a user by email in a table with ten million \
            rows touches a few pages instead of the whole table. However, the trade-off is on writes: every insert, \
            update or delete must also update the index, which adds latency and extra storage, so write-heavy tables \
            should only index the columns that queries actually filter on.""";

    @Test
    void detailedReasonedAnswerScoresWell() {
        Evaluation evaluation = coach.evaluate(Round.TECHNICAL, Persona.PANELIST, QUESTION, STRONG_ANSWER, false,
                false);

        assertThat(evaluation.score()).isGreaterThanOrEqualTo(7);
        assertThat(evaluation.depth()).isGreaterThanOrEqualTo(7);
        assertThat(evaluation.evaluatedBy()).isEqualTo("heuristic");
        assertThat(evaluation.feedback()).isNotBlank();
        assertThat(evaluation.outline()).hasSize(4);
    }

    @Test
    void thinAnswerScoresLowAndGetsActionableTip() {
        Evaluation evaluation = coach.evaluate(Round.TECHNICAL, Persona.PANELIST, QUESTION,
                "It makes things faster.", false, false);

        assertThat(evaluation.score()).isLessThanOrEqualTo(4);
        assertThat(evaluation.tip()).isNotBlank();
    }

    @Test
    void skippedAnswerScoresZero() {
        Evaluation evaluation = coach.evaluate(Round.TECHNICAL, Persona.MENTOR, QUESTION, "", true, false);

        assertThat(evaluation.score()).isZero();
        assertThat(evaluation.substance()).isZero();
        assertThat(evaluation.tip()).isEqualTo(BANK.model().coach().tips().get("skipped"));
    }

    @Test
    void fillerWordsHurtClarity() {
        String clean = "An index keeps values sorted so lookups avoid a full table scan, which makes reads fast "
                + "but every write must also update the index.";
        String filler = "Um basically an index you know keeps values sorted um so lookups basically avoid a full "
                + "table scan, which makes reads fast but you know every write must also update the index.";

        int cleanClarity = coach.evaluate(Round.TECHNICAL, Persona.PANELIST, QUESTION, clean, false, false).clarity();
        int fillerClarity = coach.evaluate(Round.TECHNICAL, Persona.PANELIST, QUESTION, filler, false, false)
                .clarity();

        assertThat(fillerClarity).isLessThan(cleanClarity);
    }

    @Test
    void barRaiserIsStricterThanMentorAndHintsCostAPoint() {
        int mentor = coach.evaluate(Round.TECHNICAL, Persona.MENTOR, QUESTION, STRONG_ANSWER, false, false).score();
        int barRaiser = coach.evaluate(Round.TECHNICAL, Persona.BAR_RAISER, QUESTION, STRONG_ANSWER, false, false)
                .score();
        int withHint = coach.evaluate(Round.TECHNICAL, Persona.MENTOR, QUESTION, STRONG_ANSWER, false, true)
                .score();

        assertThat(barRaiser).isLessThanOrEqualTo(mentor);
        assertThat(withHint).isLessThan(mentor);
    }

    @Test
    void starStructureDeepensBehaviouralAnswers() {
        String question = "Tell me about a time you disagreed with a teammate.";
        String star = "During my internship our team had to pick a database. I proposed Postgres and I talked "
                + "through the trade-offs with my teammate. As a result we shipped two weeks early.";
        String plain = "I disagreed with a teammate about a database once and we talked and picked one together "
                + "and it was fine in the end for everyone involved.";

        int starDepth = coach.evaluate(Round.HR, Persona.PANELIST, question, star, false, false).depth();
        int plainDepth = coach.evaluate(Round.HR, Persona.PANELIST, question, plain, false, false).depth();

        assertThat(starDepth).isGreaterThan(plainDepth);
    }

    @Test
    void difficultyAdaptsToScores() {
        assertThat(coach.nextTier(Persona.PANELIST, Tier.CORE, 9)).isEqualTo(Tier.STRETCH);
        assertThat(coach.nextTier(Persona.PANELIST, Tier.CORE, 3)).isEqualTo(Tier.FOUNDATION);
        assertThat(coach.nextTier(Persona.PANELIST, Tier.CORE, 6)).isEqualTo(Tier.CORE);
        assertThat(coach.nextTier(Persona.BAR_RAISER, Tier.CORE, 7)).isEqualTo(Tier.STRETCH);
        assertThat(coach.startTier(Persona.PANELIST, Round.HR)).isEqualTo(Tier.FOUNDATION);
    }

    @Test
    void hintNamesTheKeyIdeas() {
        String hint = coach.hint(Round.TECHNICAL, QUESTION);

        assertThat(hint).contains("index").contains("speed");
    }
}
