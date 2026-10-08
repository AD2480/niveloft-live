package dev.projectflow.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.projectflow.web.error.ApiErrorBody;
import dev.projectflow.web.error.ErrorCode;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;

/** JSON 401/403 responses from the security filter chain, in the same shape as other errors. */
@Component
public class JsonSecurityHandlers {

    private final ObjectMapper mapper;

    public JsonSecurityHandlers(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public AuthenticationEntryPoint entryPoint() {
        return (request, response, ex) -> write(response, 401, ErrorCode.UNAUTHORIZED, "Unauthorized",
                "Your session has expired. Please sign in again.", request.getRequestURI());
    }

    public AccessDeniedHandler accessDenied() {
        return (request, response, ex) -> write(response, 403, ErrorCode.FORBIDDEN, "Forbidden",
                "You do not have permission to perform this action.", request.getRequestURI());
    }

    private void write(HttpServletResponse response, int status, ErrorCode code, String error, String message, String path) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(response.getOutputStream(), ApiErrorBody.of(status, code, error, message, null, path));
    }
}
