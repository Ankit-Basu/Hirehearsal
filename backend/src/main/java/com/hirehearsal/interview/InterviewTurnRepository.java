package com.hirehearsal.interview;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InterviewTurnRepository extends JpaRepository<InterviewTurn, Long> {

    long countByAnsweredTrue();

    @Query("""
            select avg(t.substance), avg(t.clarity), avg(t.depth) from InterviewTurn t
            where t.answered = true and t.skipped = false""")
    List<Object[]> rubricAverages();

    @Query("""
            select sum(t.wordCount), sum(t.speakingSeconds) from InterviewTurn t
            where t.answered = true and t.skipped = false
              and t.inputMode in ('voice', 'mixed') and t.speakingSeconds >= 5""")
    List<Object[]> spokenTotals();

    @Query("select avg(t.fillerCount) from InterviewTurn t where t.answered = true and t.skipped = false")
    Double averageFillers();

    @Query("""
            select t from InterviewTurn t join t.interview i
            where i.owner.id = :ownerId and t.answered = true and t.answeredAt >= :since""")
    List<InterviewTurn> findAnsweredByOwnerSince(@Param("ownerId") String ownerId, @Param("since") Instant since);

    @Query("""
            select sum(t.speakingSeconds) from InterviewTurn t join t.interview i
            where i.owner.id = :ownerId and t.answered = true""")
    Long sumSpeakingSecondsByOwner(@Param("ownerId") String ownerId);
}
