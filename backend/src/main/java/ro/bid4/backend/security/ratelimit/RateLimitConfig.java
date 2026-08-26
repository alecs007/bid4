package ro.bid4.backend.security.ratelimit;

import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.Bucket4jLettuce;
import io.lettuce.core.RedisClient;
import java.time.Duration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

@Configuration
public class RateLimitConfig {

  /**
   * Reuses the Lettuce client Boot already configured from {@code spring.data.redis.*}, rather than
   * opening a second one with its own copy of the host, password and timeouts to drift.
   *
   * <p>Buckets expire once they would have refilled to full: an address seen once should not occupy
   * a key forever.
   */
  @Bean
  ProxyManager<byte[]> rateLimitBuckets(RedisConnectionFactory connectionFactory) {
    if (!(connectionFactory instanceof LettuceConnectionFactory lettuce)) {
      throw new IllegalStateException(
          "Rate limiting expects the Lettuce connection factory, found "
              + connectionFactory.getClass().getName());
    }
    RedisClient client = (RedisClient) lettuce.getRequiredNativeClient();

    return Bucket4jLettuce.casBasedBuilder(client)
        .expirationAfterWrite(
            ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(Duration.ofHours(1)))
        .build();
  }
}
