package ro.bid4.backend.security.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.ConsumptionProbe;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.EnumMap;
import java.util.Map;
import java.util.function.Supplier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import ro.bid4.backend.common.config.Bid4Properties;

@Service
public class RateLimiter {
  private static final Logger log = LoggerFactory.getLogger(RateLimiter.class);

  private final ProxyManager<byte[]> buckets;
  private final Bid4Properties properties;
  private final Map<RateLimitPolicy, Supplier<BucketConfiguration>> configurations =
      new EnumMap<>(RateLimitPolicy.class);

  public RateLimiter(ProxyManager<byte[]> buckets, Bid4Properties properties) {
    this.buckets = buckets;
    this.properties = properties;
    configurations.put(RateLimitPolicy.AUTH, configFor(properties.rateLimit().auth()));
    configurations.put(RateLimitPolicy.WRITE, configFor(properties.rateLimit().write()));
    configurations.put(RateLimitPolicy.READ, configFor(properties.rateLimit().read()));
  }

  public RateLimitDecision charge(RateLimitPolicy policy, String identity) {
    long limit = ruleFor(policy).capacity();
    if (!properties.rateLimit().enabled()) {
      return RateLimitDecision.allowed(limit, limit);
    }

    try {
      ConsumptionProbe probe =
          buckets
              .builder()
              .build(key(policy, identity), configurations.get(policy))
              .tryConsumeAndReturnRemaining(1);

      return probe.isConsumed()
          ? RateLimitDecision.allowed(limit, probe.getRemainingTokens())
          : RateLimitDecision.refused(limit, secondsUntilRefill(probe));
    } catch (RuntimeException ex) {
      log.warn("Rate limiter unavailable for policy {}", policy, ex);
      return policy.failClosed()
          ? RateLimitDecision.refused(limit, 30)
          : RateLimitDecision.allowed(limit, 0);
    }
  }

  private Bid4Properties.RateLimit.Rule ruleFor(RateLimitPolicy policy) {
    return switch (policy) {
      case AUTH -> properties.rateLimit().auth();
      case REFRESH -> properties.rateLimit().refresh();
      case WRITE -> properties.rateLimit().write();
      case READ -> properties.rateLimit().read();
    };
  }

  private static Supplier<BucketConfiguration> configFor(Bid4Properties.RateLimit.Rule rule) {
    BucketConfiguration configuration =
        BucketConfiguration.builder()
            .addLimit(
                Bandwidth.builder()
                    .capacity(rule.capacity())
                    .refillGreedy(rule.capacity(), rule.window())
                    .build())
            .build();
    return () -> configuration;
  }

  private static byte[] key(RateLimitPolicy policy, String identity) {
    return ("rl:" + policy.name().toLowerCase() + ":" + identity).getBytes(StandardCharsets.UTF_8);
  }

  private static long secondsUntilRefill(ConsumptionProbe probe) {
    return Math.max(Duration.ofNanos(probe.getNanosToWaitForRefill()).toSeconds(), 1);
  }
}
