package com.hirehearsal.interview;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class RoundPlannerTest {

    @Test
    void fullLoopOpensAndClosesWithHr() {
        assertThat(RoundPlanner.plan(Track.MIXED, 5, true))
                .containsExactly(Round.HR, Round.TECHNICAL, Round.TECHNICAL, Round.PROJECT, Round.HR);
    }

    @Test
    void fullLoopWithoutAProjectAsksTechnicalQuestionsInstead() {
        assertThat(RoundPlanner.plan(Track.MIXED, 5, false))
                .containsExactly(Round.HR, Round.TECHNICAL, Round.TECHNICAL, Round.TECHNICAL, Round.HR);
    }

    @Test
    void singleTrackInterviewsStayInTheirRound() {
        assertThat(RoundPlanner.plan(Track.PROJECT, 4, true)).containsOnly(Round.PROJECT).hasSize(4);
        assertThat(RoundPlanner.plan(Track.HR, 3, false)).containsOnly(Round.HR).hasSize(3);
    }

    @Test
    void rejectsUnsupportedLoopLengths() {
        assertThatThrownBy(() -> RoundPlanner.plan(Track.MIXED, 2, true))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
