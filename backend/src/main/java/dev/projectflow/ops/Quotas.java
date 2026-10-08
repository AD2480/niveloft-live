package dev.projectflow.ops;

import dev.projectflow.billing.BillingRecords;
import dev.projectflow.billing.Plan;
import dev.projectflow.config.BillingProperties;
import dev.projectflow.config.OpsProperties;
import dev.projectflow.domain.InvitationStatus;
import dev.projectflow.domain.ProjectStatus;
import dev.projectflow.domain.Role;
import dev.projectflow.repository.InvitationRepository;
import dev.projectflow.repository.ProjectMemberRepository;
import dev.projectflow.repository.ProjectRepository;
import dev.projectflow.repository.StoredFileRepository;
import dev.projectflow.repository.TaskRepository;
import dev.projectflow.web.error.ApiException;
import dev.projectflow.web.error.ErrorCode;
import java.time.Clock;
import java.time.Instant;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * How much one project or one person can hold. Two kinds of limit:
 * - the server's own (generous, they stop a runaway script or a bug from filling the database);
 * - the plan's (Free, Pro, Team: active projects per account, people per project), which follow the
 *   project owner's paid plan. Viewers never count towards a plan's people.
 * Each limit says what it is and, for plan limits, how to get more room.
 */
@Component
public class Quotas {

    private final OpsProperties.Limits limits;
    private final TaskRepository tasks;
    private final ProjectRepository projects;
    private final ProjectMemberRepository members;
    private final InvitationRepository invitations;
    private final StoredFileRepository files;
    private final BillingRecords billing;
    private final boolean planLimits;
    private final Clock clock;

    public Quotas(OpsProperties ops, TaskRepository tasks, ProjectRepository projects, ProjectMemberRepository members, InvitationRepository invitations, StoredFileRepository files,
                  BillingRecords billing, BillingProperties billingProps, Clock clock) {
        this.billing = billing;
        this.planLimits = billingProps == null || billingProps.enforced();
        this.clock = clock;
        this.limits = ops.limitsOrDefault();
        this.tasks = tasks;
        this.projects = projects;
        this.members = members;
        this.invitations = invitations;
        this.files = files;
    }

    public void checkTaskRoom(Long projectId) {
        int max = limits.tasksPerProject();
        if (max > 0 && tasks.countByProjectId(projectId) >= max) {
            throw limit("This project has reached the limit of " + max + " tasks. Archive it and start a new one, or ask the server's operator to raise MAX_TASKS_PER_PROJECT.", null);
        }
    }

    public void checkProjectRoom(Long userId) {
        int max = limits.projectsPerUser();
        if (max > 0 && projects.countByOwnerId(userId) >= max) {
            throw limit("You own " + max + " projects, the most one person can. Delete or hand over one to create another.", null);
        }
    }

    public void checkMemberRoom(Long projectId) {
        int max = limits.membersPerProject();
        if (max > 0 && members.countByProjectId(projectId) + invitations.countByProjectIdAndStatus(projectId, InvitationStatus.PENDING) >= max) {
            throw limit("This project has reached the limit of " + max + " people (members and pending invitations).", "email");
        }
    }

    /**
     * The plan's limit on active projects, for a project that is about to become active (created,
     * or moved back from completed or archived). Completed and archived projects don't count.
     */
    public void checkActiveProjectRoom(Long ownerId, ProjectStatus status) {
        if (!planLimits || ownerId == null || !isActive(status)) return;
        Plan plan = planOf(ownerId);
        int max = plan.maxActiveProjects();
        if (max > 0 && billing.countActiveProjects(ownerId) >= max) {
            throw planLimit("The " + plan.label() + " plan includes " + max + " active projects. Complete or archive one, or upgrade in Settings → Plan and billing.");
        }
    }

    /**
     * The plan's limit on people in a project, for someone about to join with {@code role} (an
     * invitation, or a viewer becoming a member). Viewers are always free.
     */
    public void checkSeat(Long projectId, Role role) {
        if (!planLimits || projectId == null || role == null || role == Role.VIEWER) return;
        Long owner = billing.ownerOf(projectId).orElse(null);
        if (owner == null) return;
        Plan plan = planOf(owner);
        int max = plan.maxPeoplePerProject();
        if (max > 0 && billing.countPeople(projectId) >= max) {
            throw planLimit("This project has " + max + " people, the most the owner’s " + plan.label()
                    + " plan includes. Invite them as a viewer (viewers are free), or the project owner can upgrade in Settings → Plan and billing.");
        }
    }

    private Plan planOf(long userId) {
        return billing.plan(userId).effective(Instant.now(clock));
    }

    private static boolean isActive(ProjectStatus status) {
        return status == null || status == ProjectStatus.ACTIVE || status == ProjectStatus.ON_HOLD;
    }

    private static ApiException planLimit(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.PLAN_LIMIT, message, null);
    }

    /** Throws if adding {@code incoming} bytes would take the project over its storage quota. */
    public void checkStorage(Long projectId, long incoming) {
        long max = limits.storageBytesPerProject();
        if (max > 0 && files.sumSizeByProjectId(projectId) + incoming > max) {
            throw limit("This project’s file storage is full (" + (max / 1024 / 1024) + " MB). Link to the files instead (a repository, a drive), or remove old evidence.", "files");
        }
    }

    private static ApiException limit(String message, String field) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, ErrorCode.LIMIT_REACHED, message, field == null ? null : Map.of(field, message));
    }
}
