package com.hirehearsal.security;

import com.hirehearsal.config.HirehearsalProperties;
import com.hirehearsal.user.AppUser;
import java.time.Clock;
import java.time.Instant;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class TokenService {

    public record IssuedToken(String value, Instant expiresAt) {
    }

    private final JwtEncoder encoder;
    private final HirehearsalProperties properties;
    private final Clock clock;

    public TokenService(JwtEncoder encoder, HirehearsalProperties properties, Clock clock) {
        this.encoder = encoder;
        this.properties = properties;
        this.clock = clock;
    }

    public IssuedToken issue(AppUser user) {
        Instant now = clock.instant();
        Instant expiresAt = now.plus(properties.security().tokenTtl());
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("hirehearsal")
                .subject(user.getId())
                .issuedAt(now)
                .expiresAt(expiresAt)
                .claim("name", user.getDisplayName())
                .build();
        String token = encoder
                .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
                .getTokenValue();
        return new IssuedToken(token, expiresAt);
    }
}
