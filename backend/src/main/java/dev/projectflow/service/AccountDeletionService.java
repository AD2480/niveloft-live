package dev.projectflow.service;

import dev.projectflow.domain.ProjectMember;
import dev.projectflow.domain.Role;
import dev.projectflow.domain.User;
import dev.projectflow.live.LiveUpdateService;
import dev.projectflow.repository.AccountTokenRepository;
import dev.projectflow.repository.ProjectMemberRepository;
import dev.projectflow.repository.UserRepository;
import dev.projectflow.security.CurrentUser;
import dev.projectflow.web.error.ApiException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Deletes the signed-in person's account (GDPR "right to erasure").
 *
 * Other people's records (comments, reviews, activity) point at the user row, so the row is kept
 * and every personal detail in it is erased: the name becomes "Deleted user", the email an
 * undeliverable placeholder, and the password a random one nobody knows. Every session ends.
 *
 * Projects the person owns alone are deleted with everything in them. A project they own that
 * still has other members blocks the deletion until ownership is handed over or the project is
 * deleted, so nobody else's work disappears without a decision. Their other memberships end, as
 * if they had left (their open tasks lose their owner).
 */
@Service
public class AccountDeletionService {

    private static final Logger log = LoggerFactory.getLogger(AccountDeletionService.class);

    private final UserRepository users;
    private final ProjectMemberRepository members;
    private final ProjectService projects;
    private final AccountTokenRepository tokens;
    private final LiveUpdateService live;
    private final PasswordEncoder encoder;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();

    public AccountDeletionService(UserRepository users, ProjectMemberRepository members, ProjectService projects, AccountTokenRepository tokens,
                                  LiveUpdateService live, PasswordEncoder encoder, Clock clock) {
        this.users = users;
        this.members = members;
        this.projects = projects;
        this.tokens = tokens;
        this.live = live;
        this.encoder = encoder;
        this.clock = clock;
    }

    @Transactional
    public void deleteMe(String password) {
        User u = users.findById(CurrentUser.id()).orElseThrow(() -> ApiException.unauthorized("Your session has expired. Please sign in again."));
        if (password == null || !encoder.matches(password, u.getPasswordHash())) {
            throw ApiException.validation("password", "Password is incorrect.");
        }

        List<ProjectMember> memberships = members.findByUserId(u.getId());
        List<Long> ownedAlone = new ArrayList<>();
        List<Long> leave = new ArrayList<>();
        List<String> blocking = new ArrayList<>();
        for (ProjectMember m : memberships) {
            Long projectId = m.getProject().getId();
            if (m.getRole() == Role.OWNER) {
                if (members.countByProjectId(projectId) > 1) blocking.add(m.getProject().getName());
                else ownedAlone.add(projectId);
            } else {
                leave.add(projectId);
            }
        }
        if (!blocking.isEmpty()) {
            throw ApiException.conflict("You own projects other people still work in: " + String.join(", ", blocking)
                    + ". Remove their other members, or delete those projects, then try again.");
        }

        // Check-then-act ran inside one transaction, so a failure part-way leaves everything as it was.
        for (Long projectId : ownedAlone) projects.delete(projectId);
        for (Long projectId : leave) projects.leave(projectId);

        Long id = u.getId();
        u.setName("Deleted user");
        u.setEmail("deleted-" + id + "@deleted.invalid");
        u.setJobTitle(null);
        u.setPasswordHash(encoder.encode(randomSecret()));
        u.bumpSessionVersion();
        users.save(u);
        tokens.retireEverything(id, Instant.now(clock));
        live.endSessions(id);
        log.info("Account {} deleted at its owner's request ({} projects deleted, {} left).", id, ownedAlone.size(), leave.size());
    }

    private String randomSecret() {
        byte[] b = new byte[32];
        random.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }
}
