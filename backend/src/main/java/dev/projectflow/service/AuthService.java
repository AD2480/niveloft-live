package dev.projectflow.service;

import dev.projectflow.site.SiteRecords;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import dev.projectflow.config.AppProperties;
import dev.projectflow.domain.AccountToken;
import dev.projectflow.domain.User;
import dev.projectflow.email.AccountEmails;
import dev.projectflow.email.EmailService;
import dev.projectflow.live.LiveUpdateService;
import dev.projectflow.repository.AccountTokenRepository;
import dev.projectflow.repository.UserRepository;
import dev.projectflow.security.ClientInfo;
import dev.projectflow.security.CurrentUser;
import dev.projectflow.security.HumanCheck;
import dev.projectflow.security.JwtService;
import dev.projectflow.security.RateLimiter;
import dev.projectflow.web.dto.Dto;
import dev.projectflow.web.dto.Requests;
import dev.projectflow.web.error.ApiException;
import dev.projectflow.web.error.ErrorCode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registration, sign-in, emailed links (confirm the address, reset the password) and account
 * settings. Passwords are stored as BCrypt hashes; emailed links are stored as SHA-256 hashes.
 *
 * <p>Bots and guessing are slowed by per-address and per-account limits, a honeypot field and,
 * when configured, Cloudflare Turnstile. Answers never reveal whether an email has an account,
 * except at registration, where "already registered" is the helpful answer.
 */
@Service
public class AuthService {

    static final List<String> PALETTE = List.of("#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#14b8a6", "#f97316", "#64748b");
    static final Duration VERIFY_TTL = Duration.ofHours(24);
    static final Duration RESET_TTL = Duration.ofHours(1);

    private final UserRepository users;
    private final AccountTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final DtoMapper mapper;
    private final Clock clock;
    private final EmailService email;
    private final AccountEmails emails;
    private final RateLimiter limits;
    private final HumanCheck human;
    private final LiveUpdateService live;
    private final boolean verificationRequired;
    private final boolean registrationOpen;
    private final boolean signInAlerts;
    private final SecureRandom random = new SecureRandom();
    /** Compared against when the email is unknown, so response time doesn't reveal which emails exist. */
    private final String dummyHash;

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private final SiteRecords site;

    public AuthService(UserRepository users, AccountTokenRepository tokens, PasswordEncoder encoder, JwtService jwt, DtoMapper mapper, Clock clock,
                       EmailService email, AccountEmails emails, RateLimiter limits, HumanCheck human, LiveUpdateService live, AppProperties props,
                       SiteRecords site) {
        this.site = site;
        this.users = users;
        this.tokens = tokens;
        this.encoder = encoder;
        this.jwt = jwt;
        this.mapper = mapper;
        this.clock = clock;
        this.email = email;
        this.emails = emails;
        this.limits = limits;
        this.human = human;
        this.live = live;
        AppProperties.Accounts accounts = props.accounts();
        String rule = accounts == null || accounts.requireEmailVerification() == null ? "auto" : accounts.requireEmailVerification().trim().toLowerCase();
        this.verificationRequired = switch (rule) {
            case "true", "yes", "on" -> true;
            case "false", "no", "off" -> false;
            default -> email.delivers(); // auto: only when emails can actually arrive
        };
        if (verificationRequired && !email.enabled()) {
            throw new IllegalStateException("REQUIRE_EMAIL_VERIFICATION=true needs email: set EMAIL_PROVIDER to resend (or log for local testing).");
        }
        this.registrationOpen = accounts == null || accounts.open();
        this.signInAlerts = props.email() == null || props.email().alertsOnSignIn();
        this.dummyHash = encoder.encode("projectflow-timing-dummy");
    }

    public Dto.AuthOptions options() {
        return new Dto.AuthOptions(registrationOpen, email.delivers(), verificationRequired, email.enabled(), human.turnstileEnabled());
    }

    private Dto.AuthResponse tokenFor(User u) {
        return new Dto.AuthResponse(jwt.issue(u.getId(), u.getEmail(), u.getSessionVersion()), "Bearer", jwt.expirationSeconds(), mapper.user(u), false, u.getEmail());
    }

    // ------------------------------------------------------------------ sign-up and sign-in

    @Transactional
    public Dto.AuthResponse register(Requests.Register req, ClientInfo client) {
        if (!registrationOpen) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.NOT_AVAILABLE, "New accounts can’t be created on this server right now.", null);
        }
        // Generous per address: a class behind one campus network shares an IP.
        limits.check("register-ip", client.limitKey(), 20, Duration.ofHours(1));
        human.require(req.website(), req.captchaToken(), client.ip());
        requireBcryptLength(req.password(), "password");
        String address = req.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(address)) {
            throw ApiException.conflict("An account with this email already exists. Sign in, or use “Forgot password?”.", "email");
        }
        Instant now = Instant.now(clock);
        User u = new User();
        u.setName(req.name().trim());
        u.setEmail(address);
        u.setPasswordHash(encoder.encode(req.password()));
        u.setAvatarColor(PALETTE.get((int) (users.count() % PALETTE.size())));
        u.setCreatedAt(now);
        u.setTermsAcceptedAt(now);
        users.save(u);
        // Which campaign brought them (UTM tags), for the operator's sign-up sources. Never blocks a sign-up.
        try {
            site.recordSignup(u.getId(), req.attribution());
        } catch (RuntimeException e) {
            log.warn("Couldn't save the sign-up source: {}", e.getMessage());
        }
        if (email.enabled()) {
            email.send(emails.confirm(u.getEmail(), newToken(u, AccountToken.Purpose.VERIFY_EMAIL, VERIFY_TTL), verificationRequired));
        }
        return verificationRequired ? Dto.AuthResponse.pendingVerification(u.getEmail()) : tokenFor(u);
    }

    @Transactional(readOnly = true)
    public Dto.AuthResponse login(Requests.Login req, ClientInfo client) {
        String address = req.email().trim().toLowerCase();
        // Only wrong passwords count: 30 from one address in 15 minutes, and 10 for one account from
        // one address. There's deliberately no account-wide limit across addresses: anyone could use
        // it to lock a chosen person out. Distributed guessing is still capped per address, and each
        // guess costs a BCrypt comparison.
        String here = client.limitKey() + "|" + address;
        limits.ensureUnder("login-fail-ip", client.limitKey(), 30, Duration.ofMinutes(15));
        limits.ensureUnder("login-fail", here, 10, Duration.ofMinutes(15));
        User u = users.findByEmailIgnoreCase(address).orElse(null);
        // Same message and a hash comparison either way, so emails can't be probed by response time.
        boolean ok = encoder.matches(req.password(), u == null ? dummyHash : u.getPasswordHash());
        if (u == null || !ok) {
            limits.record("login-fail-ip", client.limitKey());
            limits.record("login-fail", here);
            throw ApiException.unauthorized("Invalid email or password.");
        }
        limits.clear("login-fail", here);
        if (verificationRequired && !u.isEmailVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorCode.EMAIL_NOT_VERIFIED,
                    "Please confirm your email address first: use the link we sent to " + u.getEmail() + ", or send a new one below.", null);
        }
        // Only to confirmed addresses: an unconfirmed one might belong to someone else.
        if (signInAlerts && email.enabled() && u.isEmailVerified()) {
            email.send(emails.signIn(u.getEmail(), u.getName(), Instant.now(clock), client.device(), client.ip()));
        }
        return tokenFor(u);
    }

    // ------------------------------------------------------------------ emailed links

    /**
     * Confirms the address. It deliberately doesn't sign anyone in: if someone registered this
     * address before its owner did, the owner still has to sign in, can't, and resets the password,
     * which ends the other person's access.
     */
    @Transactional
    public Dto.VerifiedEmail verifyEmail(Requests.VerifyEmail req) {
        AccountToken t = tokens.findByTokenHash(hash(req.token().trim())).orElse(null);
        Instant now = Instant.now(clock);
        if (t == null || t.getPurpose() != AccountToken.Purpose.VERIFY_EMAIL) throw linkExpired("This confirmation link isn’t valid. Send yourself a new one from the sign-in page.");
        User u = users.findById(t.getUserId()).orElseThrow(() -> linkExpired("This account no longer exists."));
        if (!t.usableAt(now) || tokens.markUsed(t.getId(), now) == 0) {
            if (u.isEmailVerified()) throw linkExpired("Your email address is already confirmed. You can sign in.");
            throw linkExpired("This confirmation link has expired or was already used. Send yourself a new one from the sign-in page.");
        }
        tokens.retireAll(u.getId(), AccountToken.Purpose.VERIFY_EMAIL, now);
        if (!u.isEmailVerified()) u.setEmailVerifiedAt(now);
        return new Dto.VerifiedEmail(u.getEmail());
    }

    /** Sends a new confirmation link if the account exists and isn't confirmed. The answer is the same either way. */
    @Transactional
    public String resendVerification(Requests.EmailLinkRequest req, ClientInfo client) {
        requireEmail("Confirmation emails");
        limits.check("link-ip", client.limitKey(), 20, Duration.ofHours(1));
        human.require(req.website(), req.captchaToken(), client.ip());
        users.findByEmailIgnoreCase(req.email().trim()).filter(u -> !u.isEmailVerified()).ifPresent(u -> {
            if (underAccountLimit(u, AccountToken.Purpose.VERIFY_EMAIL)) {
                email.send(emails.confirm(u.getEmail(), newToken(u, AccountToken.Purpose.VERIFY_EMAIL, VERIFY_TTL), verificationRequired));
            }
        });
        return "If that address has an account waiting for confirmation, a new link is on its way. Check your inbox and spam folder.";
    }

    @Transactional
    public String forgotPassword(Requests.EmailLinkRequest req, ClientInfo client) {
        requireEmail("Password reset");
        limits.check("link-ip", client.limitKey(), 20, Duration.ofHours(1));
        human.require(req.website(), req.captchaToken(), client.ip());
        users.findByEmailIgnoreCase(req.email().trim()).ifPresent(u -> {
            if (underAccountLimit(u, AccountToken.Purpose.RESET_PASSWORD)) {
                email.send(emails.reset(u.getEmail(), newToken(u, AccountToken.Purpose.RESET_PASSWORD, RESET_TTL)));
            }
        });
        return "If that address has an account, a link to choose a new password is on its way. It works for 1 hour. Check your spam folder too.";
    }

    @Transactional
    public String resetPassword(Requests.ResetPassword req, ClientInfo client) {
        limits.check("reset-ip", client.limitKey(), 20, Duration.ofHours(1));
        requireBcryptLength(req.password(), "password");
        AccountToken t = tokens.findByTokenHash(hash(req.token().trim())).orElse(null);
        Instant now = Instant.now(clock);
        if (t == null || t.getPurpose() != AccountToken.Purpose.RESET_PASSWORD || !t.usableAt(now) || tokens.markUsed(t.getId(), now) == 0) {
            throw linkExpired("This reset link has expired or was already used. Ask for a new one.");
        }
        User u = users.findById(t.getUserId()).orElseThrow(() -> linkExpired("This account no longer exists."));
        tokens.retireEverything(u.getId(), now); // no older link (confirm or reset) works any more
        u.setPasswordHash(encoder.encode(req.password()));
        u.bumpSessionVersion(); // signs out every device, including whoever else had the password
        if (!u.isEmailVerified()) u.setEmailVerifiedAt(now); // the link proved they read this inbox
        live.endSessions(u.getId());
        email.send(emails.passwordChanged(u.getEmail(), u.getName(), now));
        return "Your password was changed and every device was signed out. Sign in with the new password.";
    }

    /** BCrypt only uses a password's first 72 bytes (and Spring refuses longer ones to be safe). */
    static void requireBcryptLength(String password, String field) {
        if (password != null && password.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw ApiException.validation(field, "Password is too long: at most 72 bytes (fewer characters if it has accents or emoji).");
        }
    }

    private void requireEmail(String what) {
        if (!email.enabled()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, ErrorCode.NOT_AVAILABLE,
                    what + " can’t be sent: this server has no email set up. Ask whoever runs it for help.", null);
        }
    }

    /** At most 3 links of a kind per account per hour, whoever asks. */
    private boolean underAccountLimit(User u, AccountToken.Purpose purpose) {
        return tokens.countByUserIdAndPurposeAndCreatedAtAfter(u.getId(), purpose, Instant.now(clock).minus(Duration.ofHours(1))) < 3;
    }

    private String newToken(User u, AccountToken.Purpose purpose, Duration ttl) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant now = Instant.now(clock);
        AccountToken t = new AccountToken();
        t.setUserId(u.getId());
        t.setPurpose(purpose);
        t.setTokenHash(hash(token));
        t.setCreatedAt(now);
        t.setExpiresAt(now.plus(ttl));
        tokens.save(t);
        return token;
    }

    static String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static ApiException linkExpired(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, ErrorCode.LINK_EXPIRED, message, null);
    }

    /** Removes links that expired more than a week ago. */
    @Scheduled(cron = "0 17 3 * * *")
    @Transactional
    public void purgeExpiredLinks() {
        tokens.deleteExpiredBefore(Instant.now(clock).minus(Duration.ofDays(7)));
    }

    // ------------------------------------------------------------------ the signed-in account

    private User me() {
        return users.findById(CurrentUser.id()).orElseThrow(() -> ApiException.unauthorized("Your session has expired. Please sign in again."));
    }

    @Transactional(readOnly = true)
    public Dto.User currentUser() {
        return mapper.user(me());
    }

    @Transactional
    public Dto.User updateProfile(Requests.UpdateProfile req) {
        User u = me();
        u.setName(req.name().trim());
        u.setJobTitle(req.jobTitle() == null || req.jobTitle().isBlank() ? null : req.jobTitle().trim());
        u.setAvatarColor(req.avatarColor());
        return mapper.user(u);
    }

    /** Changes the password, signs out every other device, and returns a new session for this one. */
    @Transactional
    public Dto.AuthResponse changePassword(Requests.ChangePassword req) {
        User u = me();
        if (!encoder.matches(req.currentPassword(), u.getPasswordHash())) {
            throw ApiException.validation("currentPassword", "Current password is incorrect.");
        }
        if (req.currentPassword().equals(req.newPassword())) {
            throw ApiException.validation("newPassword", "New password must be different from the current one.");
        }
        requireBcryptLength(req.newPassword(), "newPassword");
        u.setPasswordHash(encoder.encode(req.newPassword()));
        u.bumpSessionVersion();
        tokens.retireEverything(u.getId(), Instant.now(clock));
        live.endSessions(u.getId());
        if (email.enabled() && u.isEmailVerified()) email.send(emails.passwordChanged(u.getEmail(), u.getName(), Instant.now(clock)));
        return tokenFor(u);
    }
}
