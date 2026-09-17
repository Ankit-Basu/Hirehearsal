package com.hirehearsal.interview;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** One question of an interview, together with the candidate's answer and its evaluation. */
@Entity
@Table(name = "interview_turns",
        uniqueConstraints = @UniqueConstraint(name = "uk_turn_index", columnNames = {"interview_id", "turn_index"}))
@Getter
@Setter
@NoArgsConstructor
public class InterviewTurn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interview_id", nullable = false)
    private Interview interview;

    @Column(name = "turn_index", nullable = false)
    private int turnIndex;

    @Enumerated(EnumType.STRING)
    @Column(name = "round_type", nullable = false, length = 16)
    private Round round;

    @Enumerated(EnumType.STRING)
    @Column(name = "tier_level", nullable = false, length = 16)
    private Tier tier;

    @Column(nullable = false, length = 600)
    private String question;

    /** Where the question came from: {@code llm}, {@code bank} or {@code custom}. */
    @Column(name = "question_source", nullable = false, length = 16)
    private String questionSource;

    @Column(name = "asked_at", nullable = false)
    private Instant askedAt;

    @Column(nullable = false)
    private boolean answered;

    @Column(length = 6000)
    private String answer;

    @Column(nullable = false)
    private boolean skipped;

    @Column(name = "answered_at")
    private Instant answeredAt;

    @Column(name = "hint_used", nullable = false)
    private boolean hintUsed;

    @Column(length = 400)
    private String hint;

    private Integer score;

    private Integer substance;

    private Integer clarity;

    private Integer depth;

    @Column(length = 400)
    private String feedback;

    @Column(length = 400)
    private String tip;

    /** Newline-separated bullets describing what a strong answer covers. */
    @Column(length = 1200)
    private String outline;

    /** {@code llm} or {@code heuristic}. */
    @Column(name = "evaluated_by", length = 16)
    private String evaluatedBy;

    @Column(name = "word_count")
    private Integer wordCount;

    @Column(name = "filler_count")
    private Integer fillerCount;

    @Column(name = "speaking_seconds")
    private Integer speakingSeconds;

    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    /** {@code voice}, {@code text} or {@code mixed}. */
    @Column(name = "input_mode", length = 8)
    private String inputMode;

    public List<String> outlineItems() {
        if (outline == null || outline.isBlank()) {
            return List.of();
        }
        return Arrays.stream(outline.split("\n")).filter(line -> !line.isBlank()).toList();
    }

    public boolean isSpoken() {
        return "voice".equals(inputMode) || "mixed".equals(inputMode);
    }

    /** Words per minute for spoken answers with enough speaking time to be meaningful. */
    public Integer wpm() {
        if (!answered || skipped || wordCount == null || speakingSeconds == null || speakingSeconds < 5
                || !isSpoken()) {
            return null;
        }
        return (int) Math.round(wordCount / (speakingSeconds / 60.0));
    }
}
