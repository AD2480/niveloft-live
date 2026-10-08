package dev.projectflow.security;

/** A token bucket: {@code capacity} tokens, refilled evenly over {@code periodMs}. Thread-safe. */
public final class TokenBucket {

    private final double capacity;
    private final double perMs;
    private double tokens;
    private long last;

    public TokenBucket(int capacity, long periodMs, long now) {
        this.capacity = capacity;
        this.perMs = capacity / (double) periodMs;
        this.tokens = capacity;
        this.last = now;
    }

    /** Takes a token; returns 0, or the milliseconds until one is available (nothing is taken then). */
    public synchronized long take(long now) {
        tokens = Math.min(capacity, tokens + Math.max(0, now - last) * perMs);
        last = Math.max(last, now);
        if (tokens >= 1) {
            tokens -= 1;
            return 0;
        }
        return (long) Math.ceil((1 - tokens) / perMs);
    }

    /** Full again (nothing taken recently), so it can be forgotten. */
    public synchronized boolean idle(long now) {
        return tokens + Math.max(0, now - last) * perMs >= capacity;
    }
}
