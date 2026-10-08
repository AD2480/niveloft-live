package dev.projectflow.security;

import dev.projectflow.config.AppProperties;
import dev.projectflow.web.error.ApiException;
import dev.projectflow.web.error.ErrorCode;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Sliding-window limits on sign-up, sign-in and emailed links, per IP address and per account, to
 * slow down bots and password guessing. Counts live in memory: one server instance, reset on restart.
 */
@Component
public class RateLimiter {

    private final boolean enabled;
    private final Clock clock;
    private final Map<String, Deque<Long>> hits = new ConcurrentHashMap<>();

    public RateLimiter(AppProperties props, Clock clock) {
        this.enabled = props.botProtection() == null || props.botProtection().limitsOn();
        this.clock = clock;
    }

    /** Records an attempt, or throws 429 if {@code limit} attempts were already made within {@code window}. */
    public void check(String action, String key, int limit, Duration window) {
        if (!enabled || key == null) return;
        long now = clock.millis();
        Deque<Long> times = hits.computeIfAbsent(bucket(action, key), k -> new ArrayDeque<>());
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst() < now - window.toMillis()) times.pollFirst();
            if (times.size() >= limit) throw tooMany(times.peekFirst() + window.toMillis() - now);
            times.addLast(now);
        }
    }

    private static ApiException tooMany(long waitMs) {
        long minutes = Math.max(1, (waitMs + 59_999) / 60_000);
        return new ApiException(HttpStatus.TOO_MANY_REQUESTS, ErrorCode.RATE_LIMITED,
                "Too many attempts. Please wait " + minutes + (minutes == 1 ? " minute" : " minutes") + " and try again.", null);
    }

    /** Throws 429 if {@code limit} attempts were already recorded within {@code window}; records nothing. */
    public void ensureUnder(String action, String key, int limit, Duration window) {
        if (!enabled || key == null) return;
        long now = clock.millis();
        Deque<Long> times = hits.get(bucket(action, key));
        if (times == null) return;
        synchronized (times) {
            while (!times.isEmpty() && times.peekFirst() < now - window.toMillis()) times.pollFirst();
            if (times.size() >= limit) throw tooMany(times.peekFirst() + window.toMillis() - now);
        }
    }

    /** Counts one attempt (e.g. a failed password) towards {@link #ensureUnder}. */
    public void record(String action, String key) {
        if (!enabled || key == null) return;
        Deque<Long> times = hits.computeIfAbsent(bucket(action, key), k -> new ArrayDeque<>());
        synchronized (times) {
            times.addLast(clock.millis());
        }
    }

    /** Forgets the attempts for a key (e.g. failed sign-ins once the right password is given). */
    public void clear(String action, String key) {
        if (key != null) hits.remove(bucket(action, key));
    }

    private static String bucket(String action, String key) {
        return action + ":" + key.toLowerCase();
    }

    /** Forgets windows that have fully passed, so memory stays small. */
    @Scheduled(fixedDelay = 10 * 60 * 1000)
    public void sweep() {
        long cutoff = clock.millis() - Duration.ofHours(2).toMillis();
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                return e.getValue().isEmpty() || e.getValue().peekLast() < cutoff;
            }
        });
    }
}
