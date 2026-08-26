package ro.bid4.backend;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.redis.testcontainers.RedisContainer;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.BucketProxy;
import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.Bucket4jLettuce;
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.function.Supplier;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * A canary, not a feature test.
 *
 * <p>Bucket4j declares Lettuce 6.1.8 at provided scope while Boot 4.1 supplies 7.5.2 — a major
 * version ahead. Nothing catches that at compile time, so this exercises the real code path against
 * a real Redis. If a future Boot or Bucket4j upgrade breaks binary compatibility, this fails in CI
 * rather than silently letting every request through in production.
 */
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class Bucket4jRedisCompatibilityTest {

  @Container
  static final RedisContainer REDIS =
      new RedisContainer(DockerImageName.parse("redis:7-alpine"));

  private RedisClient client;

  @BeforeAll
  void openClient() {
    client =
        RedisClient.create(
            RedisURI.builder()
                .withHost(REDIS.getRedisHost())
                .withPort(REDIS.getRedisPort())
                .build());
  }

  @AfterAll
  void closeClient() {
    if (client != null) {
      client.shutdown();
    }
  }

  private ProxyManager<byte[]> proxyManager() {
    return Bucket4jLettuce.casBasedBuilder(client)
        .expirationAfterWrite(
            ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(
                Duration.ofMinutes(5)))
        .build();
  }

  private static Supplier<BucketConfiguration> fivePerMinute() {
    return () ->
        BucketConfiguration.builder()
            .addLimit(
                Bandwidth.builder().capacity(5).refillGreedy(5, Duration.ofMinutes(1)).build())
            .build();
  }

  @Test
  @DisplayName("a bucket counts down, throttles, and reports when to retry")
  void bucketThrottlesAndReportsRetry() {
    byte[] key = key();
    BucketProxy bucket = proxyManager().builder().build(key, fivePerMinute());

    for (int i = 1; i <= 5; i++) {
      ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);
      assertTrue(probe.isConsumed(), "request " + i + " should pass");
      assertEquals(5 - i, probe.getRemainingTokens(), "remaining tokens after request " + i);
    }

    ConsumptionProbe sixth = bucket.tryConsumeAndReturnRemaining(1);
    assertFalse(sixth.isConsumed(), "the sixth request must be throttled");
    // This is what Retry-After is built from, and the reason to take the library
    // rather than hand-roll the arithmetic.
    assertTrue(sixth.getNanosToWaitForRefill() > 0, "a throttled probe must say when to retry");
  }

  @Test
  @DisplayName("the counter lives in Redis, not in this JVM")
  void counterIsShared() {
    byte[] key = key();
    ProxyManager<byte[]> first = proxyManager();
    ProxyManager<byte[]> second = proxyManager();

    for (int i = 0; i < 5; i++) {
      assertTrue(first.builder().build(key, fivePerMinute()).tryConsume(1));
    }

    assertFalse(
        second.builder().build(key, fivePerMinute()).tryConsume(1),
        "a second client must see the bucket the first one exhausted");
  }

  @Test
  @DisplayName("buckets are isolated per key")
  void keysAreIndependent() {
    ProxyManager<byte[]> manager = proxyManager();
    byte[] mine = key();
    byte[] theirs = key();

    for (int i = 0; i < 5; i++) {
      assertTrue(manager.builder().build(mine, fivePerMinute()).tryConsume(1));
    }

    assertFalse(manager.builder().build(mine, fivePerMinute()).tryConsume(1));
    assertTrue(
        manager.builder().build(theirs, fivePerMinute()).tryConsume(1),
        "one caller exhausting their bucket must not throttle anyone else");
  }

  private static byte[] key() {
    return ("rl:test:" + UUID.randomUUID()).getBytes(StandardCharsets.UTF_8);
  }
}
