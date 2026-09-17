package com.hirehearsal.interview;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InterviewRepository extends JpaRepository<Interview, String> {

    @Query("select i from Interview i left join fetch i.turns where i.id = :id")
    Optional<Interview> findWithTurns(@Param("id") String id);

    // ── Community insights ────────────────────────────────────────────

    long countByStatus(InterviewStatus status);

    @Query("select avg(i.overallScore) from Interview i where i.overallScore is not null")
    Double averageScore();

    @Query("select avg(i.preConfidence) from Interview i")
    Double averagePreConfidence();

    @Query("select avg(i.postConfidence) from Interview i where i.postConfidence is not null")
    Double averagePostConfidence();

    @Query("select avg(i.postConfidence - i.preConfidence) from Interview i where i.postConfidence is not null")
    Double averageConfidenceDelta();

    @Query("select i.track, count(i) from Interview i group by i.track")
    List<Object[]> countByTrack();

    @Query("select i.persona, count(i) from Interview i group by i.persona")
    List<Object[]> countByPersona();

    List<Interview> findByCreatedAtGreaterThanEqual(Instant since);

    // ── Per-user progress ─────────────────────────────────────────────

    Page<Interview> findByOwnerIdOrderByCreatedAtDesc(String ownerId, Pageable pageable);

    @Query("""
            select i from Interview i
            where i.owner.id = :ownerId and i.answeredCount > 0
            order by i.createdAt desc""")
    List<Interview> findAnsweredByOwner(@Param("ownerId") String ownerId, Pageable pageable);

    long countByOwnerId(String ownerId);

    @Query("select sum(i.answeredCount) from Interview i where i.owner.id = :ownerId")
    Long sumAnsweredByOwner(@Param("ownerId") String ownerId);

    List<Interview> findByIdInAndOwnerIsNull(Collection<String> ids);
}
