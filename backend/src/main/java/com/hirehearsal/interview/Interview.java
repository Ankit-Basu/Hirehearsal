package com.hirehearsal.interview;

import com.hirehearsal.user.AppUser;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "interviews", indexes = {
        @Index(name = "idx_interviews_created_at", columnList = "created_at"),
        @Index(name = "idx_interviews_owner", columnList = "owner_id")})
@Getter
@Setter
@NoArgsConstructor
public class Interview {

    @Id
    @Column(length = 36)
    private String id;

    /** Null for guest interviews. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id")
    private AppUser owner;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Track track;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Persona persona;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private InterviewStatus status;

    @Column(length = 80)
    private String role;

    @Column(length = 120)
    private String topic;

    @Column(name = "project_name", length = 120)
    private String projectName;

    @Column(name = "project_summary", length = 1500)
    private String projectSummary;

    @Column(name = "job_description", length = 4000)
    private String jobDescription;

    @Column(nullable = false, length = 160)
    private String headline;

    /** Comma-separated {@link Round} names, one per question. */
    @Column(name = "round_plan", nullable = false, length = 120)
    private String roundPlan;

    @Column(nullable = false)
    private boolean drill;

    /** Newline-separated fixed questions for retry drills. */
    @Column(name = "drill_questions", length = 3000)
    private String drillQuestions;

    @Column(name = "source_interview_id", length = 36)
    private String sourceInterviewId;

    @Column(name = "question_count", nullable = false)
    private int questionCount;

    @Column(name = "answered_count", nullable = false)
    private int answeredCount;

    @Column(name = "pre_confidence", nullable = false)
    private int preConfidence;

    @Column(name = "post_confidence")
    private Integer postConfidence;

    @Column(length = 600)
    private String reflection;

    @Column(name = "overall_score")
    private Double overallScore;

    @Column(name = "ended_early", nullable = false)
    private boolean endedEarly;

    /** The engine available when the interview started: {@code llm} or {@code offline}. */
    @Column(nullable = false, length = 16)
    private String engine;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "finished_at")
    private Instant finishedAt;

    @Version
    private Long version;

    @OneToMany(mappedBy = "interview", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("turnIndex ASC")
    private List<InterviewTurn> turns = new ArrayList<>();

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }

    public void addTurn(InterviewTurn turn) {
        turn.setInterview(this);
        turns.add(turn);
    }

    public Optional<InterviewTurn> turn(int index) {
        return turns.stream().filter(turn -> turn.getTurnIndex() == index).findFirst();
    }

    /** The most recently asked question. */
    public Optional<InterviewTurn> currentTurn() {
        return turns.stream().max((a, b) -> Integer.compare(a.getTurnIndex(), b.getTurnIndex()));
    }

    public List<Round> rounds() {
        return Arrays.stream(roundPlan.split(",")).map(String::trim).map(Round::valueOf).toList();
    }

    public List<String> drillQuestionList() {
        if (drillQuestions == null || drillQuestions.isBlank()) {
            return List.of();
        }
        return Arrays.stream(drillQuestions.split("\n")).filter(line -> !line.isBlank()).toList();
    }

    public Integer confidenceDelta() {
        return postConfidence == null ? null : postConfidence - preConfidence;
    }

    public boolean isOwnedBy(String userId) {
        return owner != null && owner.getId().equals(userId);
    }

    /** Marks the aggregate as changed so its optimistic-lock version is bumped. */
    public void touch() {
        updatedAt = Instant.now();
    }
}
