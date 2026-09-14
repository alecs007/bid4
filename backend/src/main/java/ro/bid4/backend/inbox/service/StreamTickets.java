package ro.bid4.backend.inbox.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;

@Service
public class StreamTickets {
  private static final Duration TTL = Duration.ofSeconds(30);

  private static final String PREFIX = "inbox:ticket:";

  private final StringRedisTemplate redis;
  private final SecureRandom random = new SecureRandom();

  public StreamTickets(StringRedisTemplate redis) {
    this.redis = redis;
  }

  public String issue(UUID userId) {
    byte[] bytes = new byte[32];
    random.nextBytes(bytes);
    String ticket = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    redis.opsForValue().set(PREFIX + ticket, userId.toString(), TTL);
    return ticket;
  }

  public UUID spend(String ticket) {
    if (ticket == null || ticket.isBlank()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED, "Autentifică-te pentru a continua.");
    }
    String userId = redis.opsForValue().getAndDelete(PREFIX + ticket);
    if (userId == null) {
      throw new ApiException(ErrorCode.INVALID_TOKEN, "Sesiunea a expirat. Reîncarcă pagina.");
    }
    return UUID.fromString(userId);
  }
}
