package com.hirehearsal.coach;

import static org.assertj.core.api.Assertions.assertThat;

import com.hirehearsal.coach.llm.LlmKeyPool;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;

class LlmKeyPoolTest {

    static final class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-09-17T10:00:00Z");

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }

    private final MutableClock clock = new MutableClock();
    private final LlmKeyPool pool = new LlmKeyPool(List.of("key-a", "key-b", "key-c"), clock);

    @Test
    void rotatesRoundRobin() {
        assertThat(List.of(next(), next(), next(), next())).containsExactly("key-a", "key-b", "key-c", "key-a");
    }

    @Test
    void skipsKeysThatAreCoolingDownUntilTheyRecover() {
        pool.coolDown("key-b", Duration.ofSeconds(30));

        assertThat(List.of(next(), next(), next())).containsExactly("key-a", "key-c", "key-a");
        assertThat(pool.available()).isEqualTo(2);

        clock.advance(Duration.ofSeconds(31));
        assertThat(pool.available()).isEqualTo(3);
    }

    @Test
    void returnsEmptyWhenEveryKeyIsParked() {
        pool.coolDown("key-a", Duration.ofMinutes(1));
        pool.coolDown("key-b", Duration.ofMinutes(1));
        pool.coolDown("key-c", Duration.ofMinutes(1));

        assertThat(pool.next()).isEmpty();
    }

    @Test
    void fingerprintNeverRevealsTheKey() {
        assertThat(LlmKeyPool.fingerprint("demo-secret-value-1234")).isEqualTo("…1234");
    }

    private String next() {
        return pool.next().orElseThrow();
    }
}
