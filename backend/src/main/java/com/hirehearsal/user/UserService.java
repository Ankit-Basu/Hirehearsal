package com.hirehearsal.user;

import com.hirehearsal.coach.Text;
import com.hirehearsal.security.TokenService;
import com.hirehearsal.user.UserDtos.AuthResponse;
import com.hirehearsal.user.UserDtos.LoginRequest;
import com.hirehearsal.user.UserDtos.RegisterRequest;
import com.hirehearsal.user.UserDtos.UpdateProfileRequest;
import com.hirehearsal.user.UserDtos.UserView;
import com.hirehearsal.web.ApiException;
import java.util.Locale;
import java.util.Optional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final AppUserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokens;
    /** Compared against when the email is unknown, so failed logins take the same time either way. */
    private final String dummyHash;

    public UserService(AppUserRepository users, PasswordEncoder passwordEncoder, TokenService tokens) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.tokens = tokens;
        this.dummyHash = passwordEncoder.encode("hirehearsal-timing-guard");
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) {
            throw ApiException.conflict("An account with this email already exists. Sign in instead.");
        }
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setDisplayName(Text.clean(request.name()));
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        users.save(user);
        return authResponse(user);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Optional<AppUser> user = users.findByEmailIgnoreCase(request.email().trim());
        boolean matches = passwordEncoder.matches(request.password(),
                user.map(AppUser::getPasswordHash).orElse(dummyHash));
        if (user.isEmpty() || !matches) {
            throw ApiException.unauthorized("Incorrect email or password.");
        }
        return authResponse(user.get());
    }

    @Transactional(readOnly = true)
    public UserView profile(String userId) {
        return view(require(userId));
    }

    @Transactional
    public UserView update(String userId, UpdateProfileRequest request) {
        AppUser user = require(userId);
        if (request.name() != null && Text.clean(request.name()) != null) {
            user.setDisplayName(Text.clean(request.name()));
        }
        if (request.targetRole() != null) {
            user.setTargetRole(Text.clean(request.targetRole()));
        }
        if (request.weeklyGoal() != null) {
            user.setWeeklyGoal(request.weeklyGoal());
        }
        return view(user);
    }

    public AppUser require(String userId) {
        return users.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Your session has expired. Sign in again."));
    }

    private AuthResponse authResponse(AppUser user) {
        TokenService.IssuedToken token = tokens.issue(user);
        return new AuthResponse(token.value(), token.expiresAt(), view(user));
    }

    static UserView view(AppUser user) {
        return new UserView(user.getId(), user.getEmail(), user.getDisplayName(), user.getTargetRole(),
                user.getWeeklyGoal(), user.getCreatedAt());
    }
}
