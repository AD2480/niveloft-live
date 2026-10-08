package dev.projectflow.security;

import dev.projectflow.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/** Issues and verifies HS256-signed JWTs. The key comes from {@code projectflow.jwt.secret}. */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationSeconds;

    /** The development default in application.yml. It is public, so it must never sign real sessions. */
    static final String DEVELOPMENT_SECRET = "ZGV2LW9ubHktcHJvamVjdGZsb3ctc2VjcmV0LWNoYW5nZS1tZS1iZWZvcmUtZGVwbG95aW5nLTEyMzQ1Ng==";

    public JwtService(AppProperties props, @Value("${spring.datasource.url:}") String datasourceUrl) {
        if (DEVELOPMENT_SECRET.equals(props.jwt().secret()) && !isLocalDatabase(datasourceUrl)) {
            throw new IllegalStateException(
                    "JWT_SECRET is not set. The built-in development key is public, so anyone could forge sign-ins. "
                            + "Set JWT_SECRET to the output of: openssl rand -base64 48");
        }
        byte[] bytes = Decoders.BASE64.decode(props.jwt().secret());
        if (bytes.length < 32) {
            throw new IllegalStateException("projectflow.jwt.secret must be a base64 value of at least 32 bytes (openssl rand -base64 48)");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationSeconds = props.jwt().expirationSeconds();
    }

    /** A database on this machine (or an in-memory one): local development, where the default key is allowed. */
    public static boolean isLocalDatabase(String url) {
        if (url == null || url.isBlank()) return true;
        String u = url.toLowerCase();
        return u.startsWith("jdbc:h2:") || u.contains("//localhost") || u.contains("//127.0.0.1") || u.contains("//[::1]") || u.contains("//host.docker.internal");
    }

    public long expirationSeconds() {
        return expirationSeconds;
    }

    public String issue(Long userId, String email, int sessionVersion) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .claim("sv", sessionVersion)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirationSeconds)))
                .signWith(key)
                .compact();
    }

    /** The user in a valid, unexpired token; empty for anything else. */
    public Optional<AuthUser> verify(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Integer sv = claims.get("sv", Integer.class);
            return Optional.of(new AuthUser(Long.valueOf(claims.getSubject()), claims.get("email", String.class), sv == null ? 0 : sv));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
