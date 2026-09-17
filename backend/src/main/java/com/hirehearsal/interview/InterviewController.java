package com.hirehearsal.interview;

import com.hirehearsal.interview.dto.InterviewRequests.AnswerSubmission;
import com.hirehearsal.interview.dto.InterviewRequests.FinishRequest;
import com.hirehearsal.interview.dto.InterviewRequests.HintRequest;
import com.hirehearsal.interview.dto.InterviewRequests.StartInterviewRequest;
import com.hirehearsal.interview.dto.InterviewResponses.AnswerResultResponse;
import com.hirehearsal.interview.dto.InterviewResponses.HintResponse;
import com.hirehearsal.interview.dto.InterviewResponses.InterviewStartedResponse;
import com.hirehearsal.interview.dto.InterviewResponses.ScorecardResponse;
import com.hirehearsal.security.CurrentUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.net.URI;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interviews")
@Tag(name = "Interviews", description = "Run a mock interview with Ora and read its scorecard")
public class InterviewController {

    private final InterviewService service;

    public InterviewController(InterviewService service) {
        this.service = service;
    }

    @PostMapping
    @Operation(summary = "Start an interview",
            description = "Guests can start interviews; signed-in users get them saved to their account.")
    public ResponseEntity<InterviewStartedResponse> start(@Valid @RequestBody StartInterviewRequest request) {
        InterviewStartedResponse response = service.start(request, CurrentUser.id());
        return ResponseEntity.created(URI.create("/api/interviews/" + response.id())).body(response);
    }

    @PostMapping("/{id}/answers")
    @Operation(summary = "Answer the open question",
            description = "Scores the answer and returns the next question, or completes the interview.")
    public AnswerResultResponse answer(@PathVariable String id, @Valid @RequestBody AnswerSubmission request) {
        return service.submitAnswer(id, request, CurrentUser.id());
    }

    @PostMapping("/{id}/hint")
    @Operation(summary = "Ask for a hint", description = "Costs one point on the question's score.")
    public HintResponse hint(@PathVariable String id, @Valid @RequestBody HintRequest request) {
        return service.hint(id, request, CurrentUser.id());
    }

    @PostMapping("/{id}/finish")
    @Operation(summary = "Save the reflection and finish",
            description = "Records post-interview confidence. Finishing early is allowed.")
    public ScorecardResponse finish(@PathVariable String id, @Valid @RequestBody FinishRequest request) {
        return service.finish(id, request, CurrentUser.id());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get the scorecard", description = "Anyone with the link can view a scorecard.")
    public ScorecardResponse scorecard(@PathVariable String id) {
        return service.scorecard(id);
    }
}
