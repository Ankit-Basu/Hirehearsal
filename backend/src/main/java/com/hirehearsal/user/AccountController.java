package com.hirehearsal.user;

import com.hirehearsal.interview.InterviewService;
import com.hirehearsal.interview.dto.InterviewResponses.InterviewSummary;
import com.hirehearsal.interview.dto.InterviewResponses.PageView;
import com.hirehearsal.progress.ProgressResponse;
import com.hirehearsal.progress.ProgressService;
import com.hirehearsal.security.CurrentUser;
import com.hirehearsal.user.UserDtos.ClaimRequest;
import com.hirehearsal.user.UserDtos.ClaimResponse;
import com.hirehearsal.user.UserDtos.UpdateProfileRequest;
import com.hirehearsal.user.UserDtos.UserView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.time.DateTimeException;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
@Tag(name = "Account", description = "The signed-in candidate's profile, history and progress")
@SecurityRequirement(name = "bearer")
public class AccountController {

    private final UserService users;
    private final InterviewService interviews;
    private final ProgressService progress;

    public AccountController(UserService users, InterviewService interviews, ProgressService progress) {
        this.users = users;
        this.interviews = interviews;
        this.progress = progress;
    }

    @GetMapping
    @Operation(summary = "Current profile")
    public UserView profile() {
        return users.profile(CurrentUser.id());
    }

    @PatchMapping
    @Operation(summary = "Update name, target role or weekly goal")
    public UserView update(@Valid @RequestBody UpdateProfileRequest request) {
        return users.update(CurrentUser.id(), request);
    }

    @GetMapping("/interviews")
    @Operation(summary = "Interview history, newest first")
    public PageView<InterviewSummary> history(@RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        return interviews.listForUser(CurrentUser.id(), page, size);
    }

    @PostMapping("/claim")
    @Operation(summary = "Attach guest interviews to this account")
    public ClaimResponse claim(@Valid @RequestBody ClaimRequest request) {
        return new ClaimResponse(interviews.claim(CurrentUser.id(), request.interviewIds()));
    }

    @GetMapping("/progress")
    @Operation(summary = "Readiness score, streak, weekly goal and trends",
            description = "Pass an IANA time zone such as Asia/Kolkata so streaks follow your local days.")
    public ProgressResponse progress(@RequestParam(defaultValue = "UTC") String tz) {
        ZoneId zone;
        try {
            zone = ZoneId.of(tz);
        } catch (DateTimeException ex) {
            zone = ZoneOffset.UTC;
        }
        return progress.progress(CurrentUser.id(), zone);
    }
}
