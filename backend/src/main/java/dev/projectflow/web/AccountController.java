package dev.projectflow.web;

import dev.projectflow.config.AppProperties;
import dev.projectflow.security.ClientInfo;
import dev.projectflow.security.CurrentUser;
import dev.projectflow.service.AccountDeletionService;
import dev.projectflow.service.AuthService;
import dev.projectflow.service.InsightService;
import dev.projectflow.service.SearchService;
import dev.projectflow.web.dto.Dto;
import dev.projectflow.web.dto.Requests;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/** Sign-in, registration, the signed-in user's account, dashboard and calendar. */
@RestController
@RequestMapping("/api")
public class AccountController {

    private final AuthService auth;
    private final InsightService insights;
    private final SearchService searchService;
    private final AccountDeletionService deletion;
    private final int trustedProxies;

    public AccountController(AuthService auth, InsightService insights, SearchService searchService, AccountDeletionService deletion, AppProperties props) {
        this.searchService = searchService;
        this.deletion = deletion;
        this.auth = auth;
        this.insights = insights;
        this.trustedProxies = props.botProtection() == null ? 1 : props.botProtection().proxies();
    }

    private ClientInfo client(HttpServletRequest request) {
        return ClientInfo.of(request, trustedProxies);
    }

    /** What the sign-in pages should offer: sign-up open, emails, confirmation, bot check. */
    @GetMapping("/auth/options")
    public ApiResponse<Dto.AuthOptions> options() {
        return ApiResponse.ok(auth.options());
    }

    @PostMapping("/auth/login")
    public ApiResponse<Dto.AuthResponse> login(@Valid @RequestBody Requests.Login req, HttpServletRequest request) {
        return ApiResponse.ok(auth.login(req, client(request)), "Signed in.");
    }

    @PostMapping("/auth/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Dto.AuthResponse> register(@Valid @RequestBody Requests.Register req, HttpServletRequest request) {
        Dto.AuthResponse res = auth.register(req, client(request));
        return ApiResponse.ok(res, res.verificationRequired() ? "Account created. Confirm your email to sign in." : "Account created.");
    }

    @PostMapping("/auth/verify-email")
    public ApiResponse<Dto.VerifiedEmail> verifyEmail(@Valid @RequestBody Requests.VerifyEmail req) {
        return ApiResponse.ok(auth.verifyEmail(req), "Email confirmed. You can sign in now.");
    }

    @PostMapping("/auth/resend-verification")
    public ApiResponse<Void> resendVerification(@Valid @RequestBody Requests.EmailLinkRequest req, HttpServletRequest request) {
        return ApiResponse.ok(null, auth.resendVerification(req, client(request)));
    }

    @PostMapping("/auth/forgot-password")
    public ApiResponse<Void> forgotPassword(@Valid @RequestBody Requests.EmailLinkRequest req, HttpServletRequest request) {
        return ApiResponse.ok(null, auth.forgotPassword(req, client(request)));
    }

    @PostMapping("/auth/reset-password")
    public ApiResponse<Void> resetPassword(@Valid @RequestBody Requests.ResetPassword req, HttpServletRequest request) {
        return ApiResponse.ok(null, auth.resetPassword(req, client(request)));
    }

    @GetMapping("/auth/me")
    public ApiResponse<Dto.User> me() {
        return ApiResponse.ok(auth.currentUser());
    }

    @PutMapping("/users/me")
    public ApiResponse<Dto.User> updateProfile(@Valid @RequestBody Requests.UpdateProfile req) {
        return ApiResponse.ok(auth.updateProfile(req), "Profile updated.");
    }

    /** Returns a new session for this device; every other device is signed out. */
    @PutMapping("/users/me/password")
    public ApiResponse<Dto.AuthResponse> changePassword(@Valid @RequestBody Requests.ChangePassword req) {
        return ApiResponse.ok(auth.changePassword(req), "Password changed. Other devices were signed out.");
    }

    /** Deletes the signed-in person's account after they confirm their password (see AccountDeletionService). */
    @PostMapping("/users/me/delete")
    public ApiResponse<Void> deleteAccount(@Valid @RequestBody Requests.DeleteAccount req) {
        deletion.deleteMe(req.password());
        return ApiResponse.ok(null, "Your account was deleted.");
    }

    @GetMapping("/dashboard")
    public ApiResponse<Dto.Dashboard> dashboard() {
        return ApiResponse.ok(insights.dashboard(CurrentUser.id()));
    }

    @GetMapping("/calendar")
    public ApiResponse<java.util.List<Dto.CalendarEvent>> calendar(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false) Long projectId,
            @RequestParam(defaultValue = "false") boolean mine) {
        return ApiResponse.ok(insights.calendar(CurrentUser.id(), from, to, projectId, mine));
    }

    /** Quick search across the caller's projects and tasks (command palette). */
    @GetMapping("/search")
    public ApiResponse<Dto.SearchResult> search(@RequestParam(defaultValue = "") String q, @RequestParam(defaultValue = "8") int limit) {
        return ApiResponse.ok(searchService.search(CurrentUser.id(), q, limit));
    }
}
