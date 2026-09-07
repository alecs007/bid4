package ro.bid4.backend.inbox.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.UUID;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;

/**
 * How a browser proves who it is on a connection that cannot carry a header.
 *
 * <p>{@code EventSource} sends no {@code Authorization}, and the refresh cookie is scoped to {@code
 * /auth} and never reaches this path — so the stream has no way to authenticate the way every other
 * request does. Putting the access token in the query string would work and would also write it
 * into every access log, proxy trace and browser history entry between here and the client, which
 * is what makes that the wrong answer rather than the easy one.
 *
 * <p>So: an authenticated POST trades the bearer token for a ticket, and the stream spends it. The
 * ticket is 256 bits of {@link SecureRandom}, lives half a minute, and is deleted as it is read —
 * one connection each, and a stolen one is worth nothing by the time anybody could use it.
 */
@Service
public class StreamTickets {

  /** Long enough to survive a slow page load, short enough that a leaked one is already dead. */
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

  /** Who it was for, and never again. */
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
