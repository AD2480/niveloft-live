package dev.projectflow.security;

/**
 * The authenticated principal extracted from a valid JWT. {@code sessionVersion} must still match
 * the account's (see {@link JwtAuthenticationFilter}); a password reset raises it.
 */
public record AuthUser(Long id, String email, int sessionVersion) {

    public AuthUser(Long id, String email) {
        this(id, email, 0);
    }
}
