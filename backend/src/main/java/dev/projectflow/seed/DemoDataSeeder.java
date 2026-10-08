package dev.projectflow.seed;

import dev.projectflow.config.AppProperties;
import dev.projectflow.domain.*;
import dev.projectflow.repository.*;
import dev.projectflow.service.BoardOrdering;
import java.time.*;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import dev.projectflow.security.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds realistic demo data into an EMPTY database (no users yet) when
 * {@code projectflow.demo-data.enabled=true}. Dates are relative to today so the demo
 * always shows overdue work, upcoming deadlines, review revisions and completed milestones.
 * Every demo account uses the password {@code Password@123}.
 */
@Component
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    public static final String DEMO_PASSWORD = "Password@123";

    private final AppProperties props;
    private final UserRepository users;
    private final ProjectRepository projects;
    private final ProjectMemberRepository members;
    private final InvitationRepository invitations;
    private final MilestoneRepository milestones;
    private final TaskRepository tasks;
    private final CommentRepository comments;
    private final SubmissionRepository submissions;
    private final ReviewRepository reviews;
    private final NotificationRepository notifications;
    private final ActivityRepository activities;
    private final TaskStatusEventRepository events;
    private final TaskDependencyRepository dependencies;
    private final PasswordEncoder encoder;
    private final Clock clock;

    /** The database address: demo data is only seeded on a hosted database when DEMO_DATA is set explicitly. */
    @Value("${spring.datasource.url:}")
    private String datasourceUrl;

    /** DEMO_DATA exactly as the environment gives it; empty when it isn't set. */
    @Value("${DEMO_DATA:}")
    private String demoDataEnv;

    public DemoDataSeeder(AppProperties props, UserRepository users, ProjectRepository projects, ProjectMemberRepository members,
                          InvitationRepository invitations, MilestoneRepository milestones, TaskRepository tasks, CommentRepository comments,
                          SubmissionRepository submissions, ReviewRepository reviews, NotificationRepository notifications,
                          ActivityRepository activities, TaskStatusEventRepository events, TaskDependencyRepository dependencies,
                          PasswordEncoder encoder, Clock clock) {
        this.dependencies = dependencies;
        this.props = props;
        this.users = users;
        this.projects = projects;
        this.members = members;
        this.invitations = invitations;
        this.milestones = milestones;
        this.tasks = tasks;
        this.comments = comments;
        this.submissions = submissions;
        this.reviews = reviews;
        this.notifications = notifications;
        this.activities = activities;
        this.events = events;
        this.encoder = encoder;
        this.clock = clock;
    }

    // ------------------------------------------------------------ demo content

    private record U(String name, String email, String color, String title) {}

    private static final List<U> USERS = List.of(
            new U("Aarav Sharma", "aarav@projectflow.dev", "#4f46e5", "Product Lead"),
            new U("Priya Nair", "priya@projectflow.dev", "#0ea5e9", "Engineering Manager"),
            new U("Rohan Mehta", "rohan@projectflow.dev", "#f97316", "Frontend Developer"),
            new U("Sneha Iyer", "sneha@projectflow.dev", "#10b981", "Backend Developer"),
            new U("Kabir Singh", "kabir@projectflow.dev", "#8b5cf6", "QA Engineer"),
            new U("Ananya Das", "ananya@projectflow.dev", "#ec4899", "UI/UX Designer"),
            new U("Vikram Rao", "vikram@projectflow.dev", "#64748b", "Faculty Mentor"));
    // indexes: 0 Aarav, 1 Priya, 2 Rohan, 3 Sneha, 4 Kabir, 5 Ananya, 6 Vikram

    /** title, status, priority, assignee (index or -1), due offset (or null), milestone index (or -1), created offset, completed offset (or null), description, criteria, checklist */
    private record T(String title, TaskStatus status, Priority priority, int assignee, Integer due, int milestone, int created, Integer completed,
                     String description, List<String> criteria, List<String> checklist) {}

    private record M(String name, String description, int due, boolean completed) {}

    private record P(String key, String name, String description, String color, ProjectStatus status, int start, int deadline, int owner,
                     List<int[]> memberRoles, List<M> milestones, List<T> tasks) {}

    private static T t(String title, TaskStatus s, Priority p, int assignee, Integer due, int ms, int created, Integer completed, String desc,
                       List<String> criteria, List<String> checklist) {
        return new T(title, s, p, assignee, due, ms, created, completed, desc, criteria, checklist);
    }

    private static final List<String> NONE = List.of();

    private static List<P> projectsSpec() {
        TaskStatus TODO = TaskStatus.TODO, PROG = TaskStatus.IN_PROGRESS, REV = TaskStatus.IN_REVIEW, DONE = TaskStatus.DONE;
        Priority LOW = Priority.LOW, MED = Priority.MEDIUM, HIGH = Priority.HIGH, URG = Priority.URGENT;
        int MANAGER = 2, MEMBER = 1, VIEWER = 0; // role codes used below
        return List.of(
                new P("CCP", "Campus Connect Portal",
                        "A single web portal where students discover campus events, join clubs and register for activities. Built as the flagship capstone with a Spring Boot API and a React client.",
                        "#4f46e5", ProjectStatus.ACTIVE, -56, 34, 0,
                        List.of(new int[]{1, MANAGER}, new int[]{2, MEMBER}, new int[]{3, MEMBER}, new int[]{4, MEMBER}, new int[]{5, MEMBER}, new int[]{6, VIEWER}),
                        List.of(new M("Design & architecture", "Personas, design system, database schema and CI.", -28, true),
                                new M("Core features beta", "Authentication, events, clubs and registration ready for beta testers.", 6, false),
                                new M("Public launch", "Admin analytics, performance work, documentation and deployment.", 34, false)),
                        List.of(
                                t("Define user personas and journeys", DONE, MED, 5, -45, 0, -55, -46, "Interview 10 students and 2 club leads. Produce 3 personas and the key journeys.",
                                        List.of("Three personas based on at least 10 interviews", "Journeys for discovering, joining and registering"), NONE),
                                t("Design system: colours, type and components", DONE, HIGH, 5, -35, 0, -50, -36, "Component library with light and dark themes.",
                                        List.of("Buttons, inputs, cards and badges documented", "Colour contrast meets WCAG AA in both themes"), NONE),
                                t("Database schema and ER diagram", DONE, HIGH, 3, -30, 0, -50, -31, "Model users, events, clubs, memberships and registrations.",
                                        List.of("ER diagram covers all entities", "Foreign keys and indexes defined"), NONE),
                                t("Set up Spring Boot project and CI pipeline", DONE, HIGH, 3, -32, 0, -49, -33, "Spring Boot, Flyway, MySQL and CI on every pull request.",
                                        List.of("CI runs tests on every pull request"), NONE),
                                t("JWT authentication (login and register)", DONE, URG, 3, -20, 1, -40, -18, "BCrypt passwords, stateless JWT, 401 handling on the client.",
                                        List.of("Passwords are stored with BCrypt", "Expired tokens return 401 and the client signs out", "Login is rate limited"), NONE),
                                t("Student profile page", DONE, MED, 2, -12, 1, -30, -10, "Profile with avatar, department, year and joined clubs.",
                                        List.of("Student can edit their own profile only"), NONE),
                                t("Event listing with search and filters", DONE, MED, 2, -8, 1, -28, -7, "Paginated list with search, category and date filters.",
                                        List.of("Search matches title and description", "Empty and loading states shown"), NONE),
                                t("Club directory API", REV, MED, 3, 2, 1, -20, null, "REST endpoints for listing, searching and viewing clubs.",
                                        List.of("Paginated with a default page size of 20", "Search covers name and category", "Returns 404 for unknown clubs"),
                                        List.of("Write integration tests", "Document endpoints in Swagger")),
                                t("Event registration flow", PROG, HIGH, 2, 4, 1, -18, null, "Register or cancel, capacity limits, waitlist and confirmation email.",
                                        List.of("Registration is refused when an event is full", "Waitlisted students are promoted when someone cancels", "A confirmation email is sent"),
                                        List.of("Capacity check", "Waitlist promotion", "Confirmation email", "Tests for full events")),
                                t("Notification service (email and in-app)", PROG, HIGH, 3, -2, 1, -16, null, "Reminders 24h before events; in-app notifications stored in the database.",
                                        List.of("Reminder emails are sent 24 hours before an event", "In-app notifications are stored and marked read"),
                                        List.of("SMTP configuration", "Reminder scheduler", "In-app notification table")),
                                t("Accessibility audit of core screens", TODO, MED, 4, 6, 1, -10, null, "Keyboard navigation, focus order, contrast and screen-reader labels.",
                                        List.of("No WCAG 2.1 AA failures on the five core screens"), NONE),
                                t("End-to-end tests for auth and events", PROG, MED, 4, 8, 1, -9, null, "Playwright tests for sign-up, login, browsing and registering.",
                                        List.of("Tests cover sign-up, login and registration", "Tests run in CI"), List.of("Sign-up test", "Login test", "Registration test")),
                                t("Admin dashboard wireframes", REV, LOW, 5, 5, 2, -6, null, "Low-fidelity wireframes for the admin analytics dashboard.",
                                        List.of("Covers registrations over time, popular events and club growth", "Includes empty states", "Includes the mobile layout"), NONE),
                                t("Admin analytics dashboard", TODO, HIGH, 2, 20, 2, -5, null, "Charts for registrations, popular events and club growth.", NONE, NONE),
                                t("Load testing and performance tuning", TODO, MED, 4, 26, 2, -4, null, "500 concurrent users; add caching where p95 > 300 ms.", NONE, NONE),
                                t("Deployment runbook", TODO, LOW, -1, 30, 2, -3, null, "Step-by-step deployment with rollback.", NONE, NONE),
                                t("Fix timetable time-zone bug", TODO, URG, 2, -1, -1, -3, null, "Events after 18:30 IST show on the next day. Store UTC; format on the client.",
                                        List.of("Events keep their local date in every time zone"), NONE),
                                t("Write the user guide", TODO, LOW, 5, 32, 2, -1, null, "Illustrated guide for students and club admins.", NONE, NONE))),
                new P("MBA", "Mobile Banking App Revamp", "Redesign of the retail banking app: faster onboarding, biometric login, bill payments and spending insights.",
                        "#0ea5e9", ProjectStatus.ACTIVE, -40, 12, 1,
                        List.of(new int[]{0, MANAGER}, new int[]{2, MEMBER}, new int[]{3, MEMBER}, new int[]{4, MEMBER}),
                        List.of(new M("Research and UX", "Competitor analysis and usability interviews.", -20, true),
                                new M("MVP release", "Onboarding, biometric login, payments and insights in the app stores.", 12, false)),
                        List.of(
                                t("Competitor research", DONE, LOW, 0, -28, 0, -39, -25, "Compare onboarding and payments in 5 banking apps.", List.of("Five apps compared on the same criteria"), NONE),
                                t("Usability interviews (8 users)", DONE, MED, 0, -22, 0, -38, -22, "Record pain points with the current app.", List.of("Eight interviews summarised"), NONE),
                                t("New onboarding flow UI", DONE, HIGH, 2, -12, 1, -30, -12, "Three-step onboarding with KYC capture.",
                                        List.of("Three steps or fewer", "KYC document capture works on iOS and Android"), NONE),
                                t("Biometric login", PROG, URG, 3, -4, 1, -25, null, "Face ID / fingerprint with PIN fallback.",
                                        List.of("Fallback to PIN after three failed attempts", "Keys stored in the secure enclave"), List.of("Android fingerprint", "iOS Face ID", "PIN fallback")),
                                t("Transaction history redesign", PROG, HIGH, 2, -1, 1, -22, null, "Grouped by day, with merchant logos and filters.", NONE, NONE),
                                t("Bill payments module", TODO, HIGH, 3, 5, 1, -20, null, "Electricity, water, mobile and card bills.", NONE, NONE),
                                t("Spending insights charts", TODO, MED, 2, 8, 1, -18, null, "Monthly category breakdown and budget alerts.", NONE, NONE),
                                t("Security penetration test", TODO, URG, 4, 10, 1, -15, null, "OWASP Mobile Top 10 review before release.", NONE, NONE),
                                t("Regression test suite", REV, MED, 4, 3, 1, -14, null, "Automated regression for login, transfers and payments.",
                                        List.of("Covers login, transfers and payments", "Runs in under 10 minutes"), NONE),
                                t("App store assets", TODO, LOW, -1, 11, 1, -10, null, "Screenshots, preview video and release notes.", NONE, NONE),
                                t("Push notification preferences", TODO, MED, -1, -3, 1, -12, null, "Let users choose which alerts they receive.", NONE, NONE),
                                t("Offline mode for balances", TODO, LOW, 3, 12, 1, -8, null, "Cache the last known balance.", NONE, NONE))),
                new P("LMS", "Library Management System", "Catalogue, issue/return and fine management for the department library. Delivered last semester.",
                        "#10b981", ProjectStatus.COMPLETED, -120, -20, 3,
                        List.of(new int[]{4, MANAGER}, new int[]{0, MEMBER}, new int[]{2, MEMBER}),
                        List.of(new M("Release 1.0", "Library staff trained and system in production.", -20, true)),
                        List.of(
                                t("Book catalogue CRUD", DONE, HIGH, 0, -80, 0, -115, -82, "Add, edit and search books.", List.of("Search by title, author and ISBN"), NONE),
                                t("Issue and return workflow", DONE, HIGH, 2, -60, 0, -100, -58, "Track due dates and returns.", List.of("Due date set on issue"), NONE),
                                t("Fine calculation", DONE, MED, 0, -45, 0, -90, -44, "Daily fine after the due date.", List.of("Rate is configurable"), NONE),
                                t("Member management", DONE, MED, 2, -40, 0, -85, -41, "Register students and staff.", NONE, NONE),
                                t("Reports for librarians", DONE, LOW, 0, -30, 0, -60, -32, "Most borrowed and overdue reports.", NONE, NONE),
                                t("Staff training session", DONE, LOW, 3, -21, 0, -40, -22, "Walk-through with a printed guide.", NONE, NONE))),
                new P("ASP", "AI Study Planner", "Generates a personalised weekly study plan from a student’s timetable, deadlines and goals.",
                        "#f59e0b", ProjectStatus.ACTIVE, -10, 60, 2,
                        List.of(new int[]{5, MANAGER}, new int[]{0, MEMBER}),
                        List.of(new M("Clickable prototype", "Prototype tested with 5 students.", 14, false),
                                new M("Pilot with 20 students", "Two-week pilot with feedback survey.", 45, false)),
                        List.of(
                                t("Problem statement and survey", DONE, MED, 0, -4, 0, -9, -3, "Survey 40 students about study planning.", List.of("At least 40 responses"), NONE),
                                t("Planner algorithm spike", REV, HIGH, 0, 2, 0, -8, null, "Greedy scheduler fitting study blocks around classes.",
                                        List.of("Never schedules over a class", "Handles a week with 30+ events"), NONE),
                                t("Timetable import (CSV and ICS)", PROG, MED, 0, 7, 0, -7, null, "Import a class timetable from CSV or .ics.",
                                        List.of("Imports CSV and .ics files", "Recurring events expand correctly"), List.of("CSV parser", "ICS parser", "Recurrence rules")),
                                t("Prototype screens", PROG, HIGH, 2, 12, 0, -6, null, "Onboarding, weekly plan and progress screens.", NONE, NONE),
                                t("Usability test plan", TODO, LOW, 5, 13, 0, -5, null, "Tasks, script and consent form.", NONE, NONE),
                                t("Pilot recruitment", TODO, MED, -1, 30, 1, -2, null, "Recruit 20 students across 3 departments.", NONE, NONE))),
                new P("HAC", "Hackathon 2026 Website", "Landing page, registration and schedule for the inter-college hackathon.",
                        "#ec4899", ProjectStatus.ACTIVE, -3, 25, 4,
                        List.of(new int[]{5, MEMBER}),
                        List.of(new M("Registrations open", "Website live with the registration form.", 10, false)),
                        List.of(
                                t("Landing page design", PROG, HIGH, 5, 5, 0, -3, null, "Hero, themes, prizes, sponsors and FAQ.", NONE, NONE),
                                t("Team registration form", TODO, HIGH, 4, 9, 0, -2, null, "Team, members, college and track.", NONE, NONE),
                                t("Schedule page", TODO, MED, -1, 15, -1, -1, null, "Day-by-day schedule with venues.", NONE, NONE))),
                // The front page's sample project, so the demo accounts see the same story inside the app.
                new P("ONB", "Launch the mobile onboarding update",
                        "A shorter, friendlier first run for the mobile app: three welcome screens, passkey sign-in and a well-timed notification prompt. The same project as the front page’s sample.",
                        "#245b78", ProjectStatus.ACTIVE, -28, 20, 0,
                        List.of(new int[]{1, MANAGER}, new int[]{2, MEMBER}, new int[]{3, MEMBER}, new int[]{4, MEMBER}, new int[]{5, MEMBER}, new int[]{6, VIEWER}),
                        List.of(new M("Research and design", "Goals, user research, the funnel and signed-off designs.", -8, true),
                                new M("Beta build", "Welcome screens, passkey sign-in and analytics, behind a flag.", 9, false),
                                new M("Launch", "Beta test, staged rollout and launch material.", 20, false)),
                        List.of(
                                t("Agree goals and success measures", DONE, HIGH, 0, -25, 0, -28, -25, "What the new first run must change, and how we’ll know it worked.",
                                        List.of("Target: 70% of new users finish onboarding (from 52%)", "Measures agreed with engineering and support"), NONE),
                                t("Interview eight new users about sign-up", DONE, HIGH, 5, -20, 0, -27, -20, "Short calls with people who signed up in the last month.",
                                        List.of("Eight interviews, notes shared", "Top three problems written up"), NONE),
                                t("Map where people drop out of today’s onboarding", DONE, HIGH, 0, -18, 0, -27, -18, "Funnel from install to first project, from last quarter’s analytics.",
                                        List.of("Drop-off per screen, with numbers", "Shared with the team"), NONE),
                                t("Audit the current sign-up screens", DONE, MED, 4, -19, 0, -26, -20, "Accessibility and error states of the screens we’re replacing.",
                                        List.of("Issues listed by severity"), NONE),
                                t("Design the three welcome screens", DONE, HIGH, 5, -9, 0, -22, -8, "Welcome, what you can do, and sign in. One round of changes after review: bigger touch targets.",
                                        List.of("Light and dark versions", "Touch targets at least 44 pt", "Signed off by product"), NONE),
                                t("Choose the passkey library", DONE, MED, 3, -15, 0, -21, -15, "Compare two libraries for passkey sign-in on the server.",
                                        List.of("Decision written down with reasons"), NONE),
                                t("Write the welcome copy", REV, MED, 0, -1, 1, -20, null, "Headlines and one line of body text for each welcome screen.",
                                        List.of("Under 12 words per headline", "Reviewed for tone"), NONE),
                                t("Build the welcome screens for iOS and Android", PROG, URG, 2, 4, 1, -18, null, "The three screens from the signed-off designs, behind a feature flag.",
                                        List.of("Matches the designs on both platforms", "Works with the largest text size", "Behind the onboarding-v2 flag"), NONE),
                                t("Passkey sign-in: server API", PROG, URG, 3, -2, 1, -18, null, "Registration and sign-in endpoints for passkeys, with a password fallback.",
                                        List.of("Register and sign in with a passkey", "Password fallback still works", "Rate limited"), NONE),
                                t("Connect passkey sign-in to the app", TODO, HIGH, 2, 8, 1, -14, null, "Use the new endpoints from the sign-in welcome screen.",
                                        List.of("Sign in with a passkey on iOS and Android", "Clear message when a device has no passkey"), NONE),
                                t("Ask for notification permission at the right moment", TODO, MED, 2, 10, 1, -12, null, "After the first project is created, not on first launch.",
                                        List.of("Prompt shows once, after the first project", "Explains what notifications are for"), NONE),
                                t("Track onboarding events in analytics", PROG, MED, 3, 7, 1, -10, null, "One event per welcome screen and for finishing onboarding.",
                                        List.of("Events visible in the dashboard", "No personal data in events"), NONE),
                                t("Accessibility check of the new flow", TODO, HIGH, 4, 11, 1, -9, null, "Screen readers, text size and contrast on both platforms.",
                                        List.of("VoiceOver and TalkBack walkthrough", "No blocking issues open"), NONE),
                                t("Beta test with 50 new users", TODO, HIGH, 1, 15, 2, -8, null, "Turn on the flag for 50 new sign-ups and watch completion.",
                                        List.of("50 users through the new flow", "Completion rate compared with the old flow"), NONE),
                                t("Staged rollout plan", PROG, MED, 1, 12, 2, -6, null, "10%, 50%, then everyone, with a rollback plan.",
                                        List.of("Steps and dates agreed", "Rollback tested"), NONE),
                                t("App Store screenshots and release notes", TODO, LOW, -1, 17, 2, -4, null, "New screenshots showing the welcome screens.",
                                        List.of("Screenshots for both stores", "Release notes reviewed"), NONE),
                                t("Help article for the new sign-in", TODO, LOW, -1, 18, 2, -3, null, "How to sign in with a passkey, and what to do without one.",
                                        List.of("Published before launch", "Linked from the sign-in screen"), NONE))));
    }

    // ------------------------------------------------------------------- seeding

    private LocalDate today;

    private LocalDate day(int offset) {
        return today.plusDays(offset);
    }

    /** A timestamp {@code offset} days from now at a local hour, never in the future for past events. */
    private Instant at(int offset, int hour, int minute) {
        ZonedDateTime z = today.plusDays(offset).atTime(hour, minute).atZone(clock.getZone());
        Instant i = z.toInstant();
        Instant now = Instant.now(clock);
        if (offset <= 0 && i.isAfter(now)) i = now.minusSeconds(3600L - minute * 60L);
        return i;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (props.demoData() == null || !props.demoData().enabled()) return;
        // A hosted database never gets the public demo accounts by accident: only when DEMO_DATA=true is set on purpose.
        boolean explicit = demoDataEnv != null && !demoDataEnv.isBlank();
        if (!explicit && !JwtService.isLocalDatabase(datasourceUrl)) {
            log.info("Demo data skipped: the database isn't local and DEMO_DATA isn't set. Set DEMO_DATA=true to seed it anyway.");
            return;
        }
        if (users.count() > 0) {
            log.info("Demo data skipped: the database already has users.");
            return;
        }
        today = LocalDate.now(clock);
        String hash = encoder.encode(DEMO_PASSWORD);
        List<User> people = new ArrayList<>();
        for (int i = 0; i < USERS.size(); i++) {
            U u = USERS.get(i);
            User user = new User();
            user.setName(u.name());
            user.setEmail(u.email());
            user.setPasswordHash(hash);
            user.setAvatarColor(u.color());
            user.setJobTitle(u.title());
            user.setCreatedAt(at(-150 + i, 9, 0));
            user.setEmailVerifiedAt(user.getCreatedAt());
            user.setTermsAcceptedAt(user.getCreatedAt());
            people.add(users.save(user));
        }
        for (P spec : projectsSpec()) seedProject(spec, people);
        seedInvitations(people);
        log.info("Demo data created: {} users, {} projects, {} tasks. Password for every account: {}", users.count(), projects.count(), tasks.count(), DEMO_PASSWORD);
    }

    private void activity(Project p, Long taskId, User actor, ActivityType type, String message, Instant when, String field, String oldV, String newV) {
        Activity a = new Activity();
        a.setProject(p);
        a.setTaskId(taskId);
        a.setActor(actor);
        a.setType(type);
        a.setMessage(message);
        a.setFieldName(field);
        a.setOldValue(oldV);
        a.setNewValue(newV);
        a.setCreatedAt(when);
        activities.save(a);
    }

    private void event(Task t, TaskStatus from, TaskStatus to, User actor, Instant when) {
        TaskStatusEvent e = new TaskStatusEvent();
        e.setTask(t);
        e.setProjectId(t.getProject().getId());
        e.setFromStatus(from);
        e.setToStatus(to);
        e.setActor(actor);
        e.setOccurredAt(when);
        events.save(e);
    }

    private void notify(User to, User actor, NotificationType type, String title, String message, String link, boolean read, Instant when, Long projectId, Long invitationId) {
        if (to.getId().equals(actor.getId())) return;
        Notification n = new Notification();
        n.setUserId(to.getId());
        n.setActor(actor);
        n.setType(type);
        n.setTitle(title);
        n.setMessage(message);
        n.setLink(link);
        n.setRead(read);
        n.setCreatedAt(when);
        n.setProjectId(projectId);
        n.setInvitationId(invitationId);
        notifications.save(n);
    }

    private static final Map<Role, String> ROLE_NAME = Map.of(Role.OWNER, "owner", Role.MANAGER, "manager", Role.MEMBER, "member", Role.VIEWER, "viewer");

    private void seedProject(P spec, List<User> people) {
        User owner = people.get(spec.owner());
        Project p = new Project();
        p.setKey(spec.key());
        p.setName(spec.name());
        p.setDescription(spec.description());
        p.setColor(spec.color());
        p.setStatus(spec.status());
        p.setStartDate(day(spec.start()));
        p.setDeadline(day(spec.deadline()));
        p.setOwner(owner);
        p.setTaskSeq(0);
        p.setCreatedAt(at(spec.start(), 9, 5));
        p.setUpdatedAt(at(Math.min(spec.start() + 5, 0), 11, 0));
        projects.save(p);
        activity(p, null, owner, ActivityType.PROJECT_CREATED, "created the project", p.getCreatedAt(), null, null, null);

        Map<Integer, Role> roles = new HashMap<>();
        roles.put(spec.owner(), Role.OWNER);
        addMember(p, owner, Role.OWNER, p.getCreatedAt());
        int i = 0;
        for (int[] mr : spec.memberRoles()) {
            Role role = switch (mr[1]) {
                case 2 -> Role.MANAGER;
                case 1 -> Role.MEMBER;
                default -> Role.VIEWER;
            };
            roles.put(mr[0], role);
            Instant joined = at(spec.start() + 1, 10 + i++, 0);
            addMember(p, people.get(mr[0]), role, joined);
            activity(p, null, people.get(mr[0]), ActivityType.MEMBER_JOINED, "joined the project as " + ROLE_NAME.get(role), joined, null, null, null);
        }
        List<Integer> managerIdx = roles.entrySet().stream().filter(e -> e.getValue() == Role.MANAGER).map(Map.Entry::getKey).sorted().toList();

        List<Milestone> ms = new ArrayList<>();
        for (M m : spec.milestones()) {
            Milestone milestone = new Milestone();
            milestone.setProject(p);
            milestone.setName(m.name());
            milestone.setDescription(m.description());
            milestone.setDueDate(day(m.due()));
            milestone.setCompleted(m.completed());
            milestone.setCompletedAt(m.completed() ? at(m.due() - 1, 17, 0) : null);
            milestone.setCreatedAt(at(spec.start() + 1, 15, 0));
            ms.add(milestones.save(milestone));
            activity(p, null, owner, ActivityType.MILESTONE_CREATED, "added milestone “" + m.name() + "”", milestone.getCreatedAt(), null, null, null);
        }

        Map<TaskStatus, Integer> columnCount = new EnumMap<>(TaskStatus.class);
        Map<Integer, Task> byNumber = new HashMap<>();
        int index = 0;
        for (T spec2 : spec.tasks()) {
            User reporter = (!managerIdx.isEmpty() && index % 2 == 1) ? people.get(managerIdx.get(0)) : owner;
            User assignee = spec2.assignee() < 0 ? null : people.get(spec2.assignee());
            p.setTaskSeq(p.getTaskSeq() + 1);
            Task t = new Task();
            t.setProject(p);
            t.setNumber(p.getTaskSeq());
            t.setTitle(spec2.title());
            t.setDescription(spec2.description());
            t.setStatus(spec2.status());
            t.setPriority(spec2.priority());
            t.setAssignee(assignee);
            t.setReporter(reporter);
            t.setDueDate(spec2.due() == null ? null : day(spec2.due()));
            t.setMilestone(spec2.milestone() < 0 ? null : ms.get(spec2.milestone()));
            int n = columnCount.merge(spec2.status(), 1, Integer::sum);
            t.setPosition(n * BoardOrdering.GAP);
            Instant created = at(spec2.created(), 9 + index % 7, (index * 7) % 60);
            t.setCreatedAt(created);
            t.setUpdatedAt(spec2.completed() != null ? at(spec2.completed(), 16, 0) : at(Math.min(spec2.created() + 3, 0), 12, 0));
            if (spec2.status() != TaskStatus.TODO) t.setStartedAt(at(spec2.created() + 1, 10, 0));
            t.setCompletedAt(spec2.completed() == null ? null : at(spec2.completed(), 16, 0));
            int c = 0;
            for (String text : spec2.criteria()) {
                AcceptanceCriterion ac = new AcceptanceCriterion();
                ac.setTask(t);
                ac.setPosition(c++);
                ac.setContent(text);
                t.getCriteria().add(ac);
            }
            c = 0;
            boolean allDone = spec2.status() == TaskStatus.IN_REVIEW || spec2.status() == TaskStatus.DONE;
            for (String text : spec2.checklist()) {
                ChecklistItem ci = new ChecklistItem();
                ci.setTask(t);
                ci.setPosition(c);
                ci.setContent(text);
                boolean done = allDone || c < spec2.checklist().size() / 2;
                ci.setDone(done);
                ci.setDoneBy(done ? assignee : null);
                ci.setDoneAt(done ? at(Math.min(spec2.created() + 2, 0), 14, 0) : null);
                t.getChecklist().add(ci);
                c++;
            }
            t.setEstimateDays(estimateFor(t.getNumber(), spec2.priority(), spec2.created(), spec2.completed()));
            tasks.save(t);
            byNumber.put(t.getNumber(), t);
            String key = spec.key() + "-" + t.getNumber();
            String link = "/projects/" + p.getId() + "/tasks/" + t.getId();
            event(t, null, TaskStatus.TODO, reporter, created);
            activity(p, t.getId(), reporter, ActivityType.TASK_CREATED, "created " + key + " “" + t.getTitle() + "”", created, null, null, null);
            if (assignee != null && !assignee.getId().equals(reporter.getId())) {
                activity(p, t.getId(), reporter, ActivityType.TASK_ASSIGNED, "assigned " + key, at(spec2.created(), 17, 0), "assignee", null, assignee.getName());
                if (spec2.status() != TaskStatus.DONE && spec2.created() >= -10) {
                    notify(assignee, reporter, NotificationType.TASK_ASSIGNED, "New task assigned to you",
                            reporter.getName() + " assigned you " + key + " “" + t.getTitle() + "” in " + p.getName() + ".", link, spec2.created() < -5, at(spec2.created(), 17, 0), p.getId(), null);
                }
            }
            if (spec2.status() != TaskStatus.TODO && assignee != null) {
                event(t, TaskStatus.TODO, TaskStatus.IN_PROGRESS, assignee, t.getStartedAt());
                activity(p, t.getId(), assignee, ActivityType.TASK_STATUS_CHANGED, "moved " + key, t.getStartedAt(), "status", "To do", "In progress");
            }
            if ((spec2.status() == TaskStatus.DONE || spec2.status() == TaskStatus.IN_REVIEW) && assignee != null) {
                User reviewer = managerIdx.stream().map(people::get).filter(u -> !u.getId().equals(assignee.getId())).findFirst()
                        .orElse(owner.getId().equals(assignee.getId()) ? people.get(managerIdx.isEmpty() ? spec.owner() : managerIdx.get(0)) : owner);
                if (reviewer.getId().equals(assignee.getId())) reviewer = owner;
                seedSubmissions(p, t, spec2, key, link, assignee, reviewer, managerIdx.stream().map(people::get).toList(), owner);
            }
            index++;
        }
        seedDependencies(p, byNumber, owner);
        seedComments(p, people);
    }

    /**
     * Demo estimates (working days), the same as the frontend's demo data. Every sixth task is left
     * unestimated so the planner shows that case. Finished tasks get the estimate their recorded time
     * suggests they had (they took 0.9–1.65× it, about 1.3× on average, a common overrun), so the
     * forecast learns a realistic pace and spread; open tasks use a simple formula.
     */
    static Integer estimateFor(int number, Priority priority, int created, Integer completed) {
        if (number % 6 == 0) return null;
        if (completed != null) {
            double workingDays = Math.max(1, completed - (created + 1)) * 5.0 / 7.0;
            double overrun = 0.9 + ((number * 7) % 6) * 0.15; // 0.9–1.65×, about 1.3× on average
            return (int) Math.min(10, Math.max(1, Math.round(workingDays / overrun)));
        }
        return 1 + (number * 3) % 5 + (priority == Priority.URGENT || priority == Priority.HIGH ? 1 : 0);
    }

    /** blocker → blocked, by task number. Includes overdue blockers (CCP-10, MBA-4) holding up other work. */
    private static final Map<String, int[][]> DEPENDENCIES = Map.of(
            "CCP", new int[][]{{3, 5}, {4, 5}, {5, 9}, {7, 9}, {9, 12}, {10, 12}, {10, 14}, {13, 14}, {12, 15}, {15, 16}, {14, 18}},
            "MBA", new int[][]{{3, 4}, {4, 6}, {4, 8}, {5, 7}, {9, 8}},
            "ONB", new int[][]{{2, 5}, {3, 5}, {5, 8}, {6, 9}, {9, 10}, {8, 11}, {8, 13}, {10, 14}, {13, 14}, {10, 17}});

    private void seedDependencies(Project p, Map<Integer, Task> byNumber, User by) {
        for (int[] pair : DEPENDENCIES.getOrDefault(p.getKey(), new int[0][])) {
            Task blocker = byNumber.get(pair[0]);
            Task blocked = byNumber.get(pair[1]);
            if (blocker == null || blocked == null) continue;
            TaskDependency d = new TaskDependency();
            d.setProjectId(p.getId());
            d.setBlocker(blocker);
            d.setBlocked(blocked);
            d.setCreatedBy(by);
            d.setCreatedAt(blocked.getCreatedAt());
            dependencies.save(d);
        }
    }

    private void addMember(Project p, User u, Role role, Instant joined) {
        ProjectMember m = new ProjectMember();
        m.setProject(p);
        m.setUser(u);
        m.setRole(role);
        m.setJoinedAt(joined);
        members.save(m);
    }

    private void seedSubmissions(Project p, Task t, T spec, String key, String link, User assignee, User reviewer, List<User> managers, User owner) {
        boolean done = spec.status() == TaskStatus.DONE;
        int finalDay = done ? spec.completed() - 1 : Math.max(spec.created() + 2, -1);
        boolean withHistory = (p.getKey().equals("CCP") && (t.getNumber() == 5 || t.getNumber() == 13)) || (p.getKey().equals("MBA") && t.getNumber() == 3);
        int version = 0;
        // Sample links use the reserved .example domain (RFC 2606): clearly fictional, never someone's real site.
        String repo = "https://git." + p.getKey().toLowerCase() + ".sample.example";

        if (withHistory) {
            version++;
            Instant firstAt = at(finalDay - 3, 14, 0);
            Submission first = submission(t, version, assignee, "First version ready for review. The pull request describes the approach; screenshots are in the PR.",
                    SubmissionStatus.CHANGES_REQUESTED, firstAt, List.<String[]>of(new String[]{"REPOSITORY", "Pull request", repo + "/pull/" + (10 + t.getNumber())}));
            event(t, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, assignee, firstAt);
            activity(p, t.getId(), assignee, ActivityType.SUBMISSION_CREATED, "submitted " + key + " for review (v1)", firstAt, null, null, null);
            Instant reviewedAt = at(finalDay - 2, 11, 0);
            String feedback = t.getNumber() == 13
                    ? "Good start. Please add the empty state for “no events yet” and the mobile layout before this can be approved."
                    : "Works well, but login is not rate limited yet and there are no tests for the expired-token case.";
            // Mark the last criterion as not met, the rest as met: the reason changes were requested.
            review(first, reviewer, ReviewDecision.CHANGES_REQUESTED, feedback, reviewedAt, false);
            event(t, TaskStatus.IN_REVIEW, TaskStatus.IN_PROGRESS, reviewer, reviewedAt);
            activity(p, t.getId(), reviewer, ActivityType.REVIEW_CHANGES_REQUESTED, "requested changes on " + key + " (v1)", reviewedAt, null, null, null);
            notify(assignee, reviewer, NotificationType.CHANGES_REQUESTED, "Changes requested", reviewer.getName() + " requested changes on " + key + " “" + t.getTitle() + "”.",
                    link, true, reviewedAt, p.getId(), null);
        }

        version++;
        Instant submittedAt = at(finalDay, 15, 30);
        List<String[]> evidence = new ArrayList<>();
        evidence.add(new String[]{"REPOSITORY", "Pull request", repo + "/pull/" + (20 + t.getNumber())});
        if (t.getNumber() % 2 == 0) evidence.add(new String[]{"DEPLOYMENT", "Preview deployment", "https://pr" + (20 + t.getNumber()) + "." + p.getKey().toLowerCase() + ".sample.example"});
        if (t.getNumber() % 3 == 0) evidence.add(new String[]{"LINK", "Demo recording", "https://drive.google.com/file/d/demo-recording/view"});
        Submission s = submission(t, version, assignee,
                version > 1 ? "Addressed every review comment: see the updated pull request. The unmet criterion is now covered and tested."
                        : "Work is complete and tested locally. Evidence linked below; each acceptance criterion is covered in the PR description.",
                done ? SubmissionStatus.APPROVED : SubmissionStatus.PENDING, submittedAt, evidence);
        event(t, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, assignee, submittedAt);
        activity(p, t.getId(), assignee, ActivityType.SUBMISSION_CREATED, "submitted " + key + " for review" + (version > 1 ? " (v" + version + ")" : ""), submittedAt, null, null, null);
        activity(p, t.getId(), assignee, ActivityType.TASK_STATUS_CHANGED, "moved " + key, submittedAt, "status", "In progress", "In review");

        if (done) {
            Instant approvedAt = at(spec.completed(), 16, 0);
            String[] notes = {"Great work — approved.", "Looks good. Merged.", "Approved. Thanks for the thorough tests.", null};
            review(s, reviewer, ReviewDecision.APPROVED, notes[t.getNumber() % 4], approvedAt, true);
            event(t, TaskStatus.IN_REVIEW, TaskStatus.DONE, reviewer, approvedAt);
            activity(p, t.getId(), reviewer, ActivityType.REVIEW_APPROVED, "approved " + key + " (v" + version + "); task is Done", approvedAt, null, null, null);
            if (spec.completed() >= -14) {
                notify(assignee, reviewer, NotificationType.REVIEW_APPROVED, "Submission approved", reviewer.getName() + " approved " + key + " “" + t.getTitle() + "”.",
                        link, spec.completed() < -4, approvedAt, p.getId(), null);
            }
        } else {
            Set<User> reviewers = new LinkedHashSet<>(managers);
            reviewers.add(owner);
            for (User r : reviewers) {
                notify(r, assignee, NotificationType.SUBMISSION, "Work submitted for review",
                        assignee.getName() + " submitted " + key + " “" + t.getTitle() + "” for review (version " + version + ").", link, false, submittedAt, p.getId(), null);
            }
        }
    }

    private Submission submission(Task t, int version, User by, String notes, SubmissionStatus status, Instant when, List<String[]> evidence) {
        Submission s = new Submission();
        s.setTask(t);
        s.setNumber(version);
        s.setSubmittedBy(by);
        s.setNotes(notes);
        s.setStatus(status);
        s.setCreatedAt(when);
        for (AcceptanceCriterion c : t.getCriteria()) {
            SubmissionCriterion sc = new SubmissionCriterion();
            sc.setSubmission(s);
            sc.setCriterionId(c.getId());
            sc.setPosition(c.getPosition());
            sc.setContent(c.getContent());
            s.getCriteria().add(sc);
        }
        int pos = 0;
        for (String[] e : evidence) {
            EvidenceItem item = new EvidenceItem();
            item.setSubmission(s);
            item.setPosition(pos++);
            item.setKind(EvidenceKind.valueOf(e[0]));
            item.setLabel(e[1]);
            item.setUrl(e[2]);
            s.getEvidence().add(item);
        }
        return submissions.save(s);
    }

    private void review(Submission s, User reviewer, ReviewDecision decision, String feedback, Instant when, boolean allMet) {
        Review r = new Review();
        r.setSubmission(s);
        r.setReviewer(reviewer);
        r.setDecision(decision);
        r.setFeedback(feedback);
        r.setCreatedAt(when);
        List<SubmissionCriterion> criteria = s.getCriteria();
        for (int i = 0; i < criteria.size(); i++) {
            ReviewCriterionResult res = new ReviewCriterionResult();
            res.setReview(r);
            res.setCriterion(criteria.get(i));
            boolean met = allMet || i < criteria.size() - 1;
            res.setMet(met);
            res.setNote(met ? null : "Not covered yet — see feedback.");
            r.getResults().add(res);
        }
        reviews.save(r);
    }

    private record C(String key, int number, int author, int offset, String body) {}

    private static final List<C> COMMENTS = List.of(
            new C("CCP", 9, 2, -4, "Waitlist logic is in. I still need to auto-promote the first waitlisted student when someone cancels."),
            new C("CCP", 9, 1, -3, "Nice. Please make sure the promotion sends the confirmation email too."),
            new C("CCP", 9, 0, -1, "Can we demo registration at Friday’s review? Even a partial flow is fine."),
            new C("CCP", 10, 3, -3, "Blocked on SMTP credentials from the IT office. Using a fake SMTP server locally for now."),
            new C("CCP", 10, 1, -2, "I’ve chased IT; they promised the credentials by Monday."),
            new C("CCP", 8, 3, -1, "Submitted. Pagination defaults to 20 items and search covers name and category."),
            new C("CCP", 17, 0, -2, "This is visible to users in the timetable — please prioritise."),
            new C("MBA", 4, 3, -5, "Android fingerprint works. iOS Face ID needs the NSFaceIDUsageDescription entry."),
            new C("MBA", 4, 1, -2, "We are 4 days past due on this. What do you need to finish?"),
            new C("ASP", 2, 5, -1, "Looks promising. I’ll review the spike tomorrow morning."));

    private void seedComments(Project p, List<User> people) {
        for (C c : COMMENTS) {
            if (!c.key().equals(p.getKey())) continue;
            Task t = tasks.findByProjectId(p.getId()).stream().filter(x -> x.getNumber() == c.number()).findFirst().orElseThrow();
            User author = people.get(c.author());
            Comment comment = new Comment();
            comment.setTask(t);
            comment.setAuthor(author);
            comment.setBody(c.body());
            comment.setCreatedAt(at(c.offset(), 11 + c.number() % 6, (c.author() * 11) % 60));
            comments.save(comment);
            activity(p, t.getId(), author, ActivityType.COMMENT_ADDED, "commented on " + c.key() + "-" + c.number(), comment.getCreatedAt(), null, null, null);
            String link = "/projects/" + p.getId() + "/tasks/" + t.getId();
            Set<User> recipients = new LinkedHashSet<>();
            if (t.getAssignee() != null) recipients.add(t.getAssignee());
            recipients.add(t.getReporter());
            String preview = c.body().length() > 80 ? c.body().substring(0, 77) + "…" : c.body();
            for (User r : recipients) {
                notify(r, author, NotificationType.COMMENT, "New comment", author.getName() + " commented on " + c.key() + "-" + c.number() + ": “" + preview + "”",
                        link, c.offset() < -2, comment.getCreatedAt(), p.getId(), null);
            }
        }
    }

    private void seedInvitations(List<User> people) {
        Project hac = projects.findAll().stream().filter(p -> p.getKey().equals("HAC")).findFirst().orElseThrow();
        Project ccp = projects.findAll().stream().filter(p -> p.getKey().equals("CCP")).findFirst().orElseThrow();
        Object[][] invites = {
                {hac, "aarav@projectflow.dev", Role.MEMBER, people.get(4), -1},
                {hac, "rohan@projectflow.dev", Role.VIEWER, people.get(4), -1},
                {ccp, "meera@projectflow.dev", Role.MEMBER, people.get(0), -2}};
        for (Object[] row : invites) {
            Project p = (Project) row[0];
            String email = (String) row[1];
            Role role = (Role) row[2];
            User by = (User) row[3];
            Instant when = at((Integer) row[4], 18, 0);
            Invitation inv = new Invitation();
            inv.setProject(p);
            inv.setEmail(email);
            inv.setRole(role);
            inv.setStatus(InvitationStatus.PENDING);
            inv.setInvitedBy(by);
            inv.setCreatedAt(when);
            invitations.save(inv);
            activity(p, null, by, ActivityType.INVITATION_SENT, "invited " + email + " as " + ROLE_NAME.get(role), when, null, null, null);
            users.findByEmailIgnoreCase(email).ifPresent(u -> notify(u, by, NotificationType.INVITATION, "Project invitation",
                    by.getName() + " invited you to join “" + p.getName() + "” as " + ROLE_NAME.get(role) + ".", "/inbox", false, when, null, inv.getId()));
        }
    }
}
