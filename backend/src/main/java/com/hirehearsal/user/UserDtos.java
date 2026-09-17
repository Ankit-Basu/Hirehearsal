package com.hirehearsal.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class UserDtos {

    private UserDtos() {
    }

    public record RegisterRequest(
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(min = 8, max = 72) String password,
            @NotBlank @Size(max = 60) String name) {
    }

    public record LoginRequest(@NotBlank @Email String email, @NotBlank @Size(max = 72) String password) {
    }

    public record UserView(String id, String email, String name, String targetRole, int weeklyGoal,
                           Instant createdAt) {
    }

    public record AuthResponse(String token, Instant expiresAt, UserView user) {
    }

    public record UpdateProfileRequest(
            @Size(min = 1, max = 60) String name,
            @Size(max = 80) String targetRole,
            @Min(1) @Max(21) Integer weeklyGoal) {
    }

    public record ClaimRequest(@NotNull @Size(max = 100) List<@NotBlank @Size(max = 36) String> interviewIds) {
    }

    public record ClaimResponse(int claimed) {
    }
}
