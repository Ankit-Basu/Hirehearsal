package com.hirehearsal.security;

import com.hirehearsal.config.HirehearsalProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * In-memory token buckets per user (or per IP for guests). Protects the LLM keys from runaway clients. For a
 * multi-instance deployment this would move to a shared store such as Redis.
 */
class RateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_TRACKED_CLIENTS = 10_000;

    private final HirehearsalProperties.RateLimit config;
    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    RateLimitFilter(HirehearsalProperties.RateLimit config) {
        this.config = config;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if (!config.enabled() || !"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }
        String path = request.getRequestURI();
        return !(path.startsWith("/api/interviews") || path.startsWith("/api/auth/"));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        boolean auth = request.getRequestURI().startsWith("/api/auth/");
        int capacity = auth ? config.authRequests() : config.interviewRequests();
        Duration window = auth ? config.authWindow() : config.interviewWindow();
        String key = (auth ? "auth|" : "interview|") + clientKey(request);

        long now = System.nanoTime();
        TokenBucket bucket = buckets.computeIfAbsent(key, ignored -> new TokenBucket(capacity, window, now));
        if (bucket.tryConsume(now)) {
            chain.doFilter(request, response);
            evictIdle(now, window);
            return;
        }

        long retryAfter = Math.max(1, TimeUnit.NANOSECONDS.toSeconds(bucket.nanosUntilNextToken(now)) + 1);
        response.setStatus(429);
        response.setHeader("Retry-After", String.valueOf(retryAfter));
        response.setContentType("application/problem+json");
        response.getWriter().write("{\"type\":\"about:blank\",\"title\":\"Too many requests\",\"status\":429,"
                + "\"detail\":\"You're going a little fast. Try again in " + retryAfter + " seconds.\"}");
    }

    private static String clientKey(HttpServletRequest request) {
        String userId = CurrentUser.id();
        if (userId != null) {
            return "user:" + userId;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return "ip:" + forwarded.split(",")[0].trim();
        }
        return "ip:" + request.getRemoteAddr();
    }

    private void evictIdle(long now, Duration window) {
        if (buckets.size() > MAX_TRACKED_CLIENTS) {
            buckets.entrySet().removeIf(entry -> now - entry.getValue().lastSeen() > window.toNanos() * 2);
        }
    }

    static final class TokenBucket {

        private final double capacity;
        private final double refillPerNano;
        private double tokens;
        private long lastRefill;
        private volatile long lastSeen;

        TokenBucket(int capacity, Duration window, long now) {
            this.capacity = capacity;
            this.refillPerNano = capacity / (double) window.toNanos();
            this.tokens = capacity;
            this.lastRefill = now;
            this.lastSeen = now;
        }

        synchronized boolean tryConsume(long now) {
            refill(now);
            lastSeen = now;
            if (tokens >= 1) {
                tokens -= 1;
                return true;
            }
            return false;
        }

        synchronized long nanosUntilNextToken(long now) {
            refill(now);
            return tokens >= 1 ? 0 : (long) Math.ceil((1 - tokens) / refillPerNano);
        }

        long lastSeen() {
            return lastSeen;
        }

        private void refill(long now) {
            long elapsed = now - lastRefill;
            if (elapsed > 0) {
                tokens = Math.min(capacity, tokens + elapsed * refillPerNano);
                lastRefill = now;
            }
        }
    }
}
