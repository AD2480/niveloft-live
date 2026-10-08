package dev.projectflow.security;

import dev.projectflow.web.error.ApiException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Static access to the signed-in user for the current request. */
public final class CurrentUser {

    private CurrentUser() {}

    public static AuthUser get() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthUser user)) {
            throw ApiException.unauthorized("Your session has expired. Please sign in again.");
        }
        return user;
    }

    public static Long id() {
        return get().id();
    }
}
