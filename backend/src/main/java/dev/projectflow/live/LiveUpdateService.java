package dev.projectflow.live;

import dev.projectflow.domain.ProjectMember;
import dev.projectflow.repository.ProjectMemberRepository;
import java.io.IOException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Server-Sent Events for live updates.
 *
 * <p>Browsers can't put a bearer token on an EventSource, so a signed-in client first asks for a
 * one-time ticket (valid {@value #TICKET_SECONDS}s) and opens the stream with it. Events are sent
 * after the transaction commits, only to current members of the project, and contain ids only —
 * the client refetches through the normal endpoints, which apply the usual permission checks.
 */
@Service
public class LiveUpdateService {

    static final int TICKET_SECONDS = 60;
    private static final long STREAM_TIMEOUT_MS = 30 * 60 * 1000L;
    private static final Logger log = LoggerFactory.getLogger(LiveUpdateService.class);

    private record Ticket(Long userId, Instant expires) {}

    private final ProjectMemberRepository members;
    private final Clock clock;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();
    private final Map<Long, List<SseEmitter>> streams = new ConcurrentHashMap<>();
    private final Map<Long, CachedMembers> memberCache = new ConcurrentHashMap<>();
    /** At most this many unused tickets per user; older ones are discarded. */
    private static final int MAX_TICKETS_PER_USER = 5;

    public LiveUpdateService(ProjectMemberRepository members, Clock clock) {
        this.members = members;
        this.clock = clock;
    }

    public String issueTicket(Long userId) {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        String ticket = HexFormat.of().formatHex(bytes);
        Instant now = Instant.now(clock);
        // Cap unused tickets per user so a client can't grow this map without limit.
        List<Map.Entry<String, Ticket>> mine = tickets.entrySet().stream()
                .filter(e -> e.getValue().userId().equals(userId))
                .sorted(Comparator.comparing(e -> e.getValue().expires()))
                .toList();
        for (int i = 0; i <= mine.size() - MAX_TICKETS_PER_USER; i++) tickets.remove(mine.get(i).getKey());
        tickets.put(ticket, new Ticket(userId, now.plusSeconds(TICKET_SECONDS)));
        return ticket;
    }

    /** Opens a stream for a valid, unused ticket; empty if the ticket is unknown, used or expired. */
    public Optional<SseEmitter> open(String ticket) {
        Ticket t = ticket == null ? null : tickets.remove(ticket);
        if (t == null || t.expires().isBefore(Instant.now(clock))) return Optional.empty();
        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        streams.compute(t.userId(), (k, list) -> {
            List<SseEmitter> l = list == null ? new CopyOnWriteArrayList<>() : list;
            l.add(emitter);
            return l;
        });
        Runnable drop = () -> remove(t.userId(), emitter);
        emitter.onCompletion(drop);
        // Complete on timeout so Spring doesn't raise AsyncRequestTimeoutException; the browser reconnects.
        emitter.onTimeout(() -> {
            drop.run();
            emitter.complete();
        });
        emitter.onError(e -> drop.run());
        send(t.userId(), emitter, "ready", Map.of("at", Instant.now(clock).toString()));
        return Optional.of(emitter);
    }

    /**
     * Ends every live stream and unused ticket of a user, after their password was reset or changed.
     * Devices that still have a valid session reconnect with a new ticket; revoked ones can't.
     */
    public void endSessions(Long userId) {
        tickets.values().removeIf(t -> t.userId().equals(userId));
        List<SseEmitter> open = streams.remove(userId);
        if (open != null) {
            for (SseEmitter e : open) {
                try {
                    e.complete();
                } catch (RuntimeException ignored) {
                    // already closed
                }
            }
        }
    }

    private void send(Long userId, SseEmitter emitter, String name, Object data) {
        try {
            emitter.send(SseEmitter.event().name(name).data(data));
        } catch (IOException | IllegalStateException e) {
            remove(userId, emitter);
        }
    }

    /** Drops a stream and, when it was the user's last one, the user's entry too. */
    private void remove(Long userId, SseEmitter emitter) {
        streams.computeIfPresent(userId, (id, list) -> {
            list.remove(emitter);
            return list.isEmpty() ? null : list;
        });
    }

    private void sendTo(Long userId, String name, Object data) {
        for (SseEmitter e : streams.getOrDefault(userId, List.of())) send(userId, e, name, data);
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onProjectChanged(LiveEvents.ProjectChanged event) {
        if (openStreams() == 0) return;
        Map<String, Object> data = new HashMap<>();
        data.put("projectId", event.projectId());
        data.put("taskId", event.taskId());
        data.put("actorId", event.actorId());
        data.put("kind", event.kind());
        Set<Long> recipients = new LinkedHashSet<>(memberIds(event.projectId(), event.kind()));
        // Someone who just left, was removed, or lost the project entirely still needs to drop it from their screen.
        if (event.actorId() != null) recipients.add(event.actorId());
        if (event.alsoTo() != null) recipients.addAll(event.alsoTo());
        for (Long userId : recipients) sendTo(userId, "project", data);
    }

    private record CachedMembers(Set<Long> ids, Instant expires) {}

    /**
     * Member ids of a project, cached for a couple of seconds: one request (e.g. applying a plan)
     * can publish many events for the same project, and each would otherwise query the members.
     * Membership changes bypass the cache.
     */
    private Set<Long> memberIds(Long projectId, String kind) {
        Instant now = Instant.now(clock);
        boolean membershipChange = kind != null && (kind.startsWith("MEMBER_") || kind.startsWith("PROJECT_DELETED"));
        CachedMembers cached = memberCache.get(projectId);
        if (!membershipChange && cached != null && cached.expires().isAfter(now)) return cached.ids();
        try {
            Set<Long> ids = new HashSet<>();
            for (ProjectMember m : members.findByProjectId(projectId)) ids.add(m.getUser().getId());
            memberCache.put(projectId, new CachedMembers(ids, now.plusSeconds(2)));
            return ids;
        } catch (RuntimeException e) {
            log.debug("Live update for project {} skipped: {}", projectId, e.getMessage());
            return Set.of();
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onUserNotified(LiveEvents.UserNotified event) {
        sendTo(event.userId(), "notification", Map.of("userId", event.userId()));
    }

    /** Keeps proxies from closing idle streams and clears expired tickets. */
    @Scheduled(fixedRate = 25_000)
    public void heartbeat() {
        Instant now = Instant.now(clock);
        tickets.entrySet().removeIf(e -> e.getValue().expires().isBefore(now));
        memberCache.entrySet().removeIf(e -> e.getValue().expires().isBefore(now));
        streams.forEach((userId, list) -> {
            for (SseEmitter e : list) {
                try {
                    e.send(SseEmitter.event().comment("keep-alive"));
                } catch (IOException | IllegalStateException ex) {
                    remove(userId, e);
                }
            }
        });
    }

    /** For tests and diagnostics. */
    public int openStreams() {
        return streams.values().stream().mapToInt(List::size).sum();
    }
}
