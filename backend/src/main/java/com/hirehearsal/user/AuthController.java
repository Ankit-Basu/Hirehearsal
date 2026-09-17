package com.hirehearsal.user;

import com.hirehearsal.user.UserDtos.AuthResponse;
import com.hirehearsal.user.UserDtos.LoginRequest;
import com.hirehearsal.user.UserDtos.RegisterRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Auth", description = "Create an account or sign in to receive a bearer token")
public class AuthController {

    private final UserService users;

    public AuthController(UserService users) {
        this.users = users;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an account")
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return users.register(request);
    }

    @PostMapping("/login")
    @Operation(summary = "Sign in")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return users.login(request);
    }
}
