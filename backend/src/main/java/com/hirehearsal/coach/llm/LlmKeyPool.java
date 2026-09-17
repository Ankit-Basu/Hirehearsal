package com.hirehearsal.coach.llm;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Round-robin rotation over several API keys. A key that is rate-limited or rejected is parked for a cooldown
 * and skipped until it expires.
 */
public class LlmKeyPool {

    private final List<String> keys;
    private final Clock clock;
    private final AtomicInteger cursor = new AtomicInteger();
    private final Map<String, Instant> cooldowns = new ConcurrentHashMap<>();

    public LlmKeyPool(List<String> keys, Clock clock) {
        this.keys = List.copyOf(keys);
        this.clock = clock;
    }

    /** The next key that is not cooling down, or empty if every key is parked. */
    public Optional<String> next() {
        int size = keys.size();
        Instant now = clock.instant();
        for (int attempt = 0; attempt < size; attempt++) {
            String key = keys.get(Math.floorMod(cursor.getAndIncrement(), size));
            Instant until = cooldowns.get(key);
            if (until == null || !until.isAfter(now)) {
                cooldowns.remove(key);
                return Optional.of(key);
            }
        }
        return Optional.empty();
    }

    public void coolDown(String key, Duration duration) {
        cooldowns.put(key, clock.instant().plus(duration));
    }

    public int size() {
        return keys.size();
    }

    public int available() {
        Instant now = clock.instant();
        return (int) keys.stream().filter(key -> {
            Instant until = cooldowns.get(key);
            return until == null || !until.isAfter(now);
        }).count();
    }

    /** A log-safe label for a key: only its last four characters. */
    public static String fingerprint(String key) {
        return key.length() <= 4 ? "****" : "…" + key.substring(key.length() - 4);
    }
}
