package com.hirehearsal.interview.dto;

import com.hirehearsal.interview.Persona;
import com.hirehearsal.interview.Round;
import com.hirehearsal.interview.Track;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class InterviewRequests {

    private InterviewRequests() {
    }

    @Schema(description = "Configure and start a mock interview")
    public record StartInterviewRequest(
            @NotNull Track track,
            @NotNull Persona persona,
            @Size(max = 80) String role,
            @Size(max = 120) String topic,
            @Size(max = 120) String projectName,
            @Size(max = 1500) String projectSummary,
            @Size(max = 4000) String jobDescription,
            @Schema(description = "3 to 8; ignored for retry drills") @NotNull @Min(1) @Max(8) Integer questionCount,
            @NotNull @Min(1) @Max(10) Integer preConfidence,
            @Schema(description = "Fixed questions for a retry drill") @Size(max = 8) List<@Valid DrillQuestion> questions,
            @Size(max = 36) String sourceInterviewId) {
    }

    public record DrillQuestion(@NotBlank @Size(max = 300) String question, Round round) {
    }

    public record AnswerSubmission(
            @NotNull @Min(1) @Max(8) Integer index,
            @Size(max = 6000) String answer,
            @Schema(description = "True when the candidate passes on the question") Boolean skipped,
            @Valid SpeechMetrics metrics) {

        /** Jackson 3 rejects missing primitives, so the flag is nullable and absent means "answered". */
        public boolean passed() {
            return Boolean.TRUE.equals(skipped);
        }
    }

    public record SpeechMetrics(
            @Min(0) @Max(3600) Integer durationSeconds,
            @Min(0) @Max(3600) Integer speakingSeconds,
            @Pattern(regexp = "voice|text|mixed") String inputMode) {
    }

    public record HintRequest(@NotNull @Min(1) @Max(8) Integer index) {
    }

    public record FinishRequest(
            @NotNull @Min(1) @Max(10) Integer postConfidence,
            @Size(max = 600) String reflection) {
    }
}
