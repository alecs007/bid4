package ro.bid4.backend.security.jwt;

import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;
import ro.bid4.backend.identity.repo.UserAccountRepository;

/**
 * Refuses an access token issued before the account's tokens were invalidated.
 *
 * <p>Without this the {@code tv} claim is decoration: it was written into every token and read by
 * nothing, so bumping the column — on a password change, on suspension, on detecting a stolen
 * refresh token — invalidated nothing, and the holder kept full access until the token expired on
 * its own. Revoking the refresh family already worked; this is what closes the fifteen-minute tail
 * behind it.
 *
 * <p>Checking it costs a lookup per request, which is why the answer is cached for a few seconds.
 * That is the whole trade: a bump takes up to {@link #CACHE_TTL} to be felt everywhere, instead of
 * up to the access token's lifetime. Short enough to be a revocation, long enough that a busy page
 * does not become a read per request.
 */
@Component
public class TokenVersionValidator implements OAuth2TokenValidator<Jwt> {

  /**
   * How stale the cached version may be.
   *
   * <p>The upper bound on how long a revoked token keeps working. Seconds rather than minutes,
   * because the point of the mechanism is to be faster than waiting for expiry.
   */
  static final Duration CACHE_TTL = Duration.ofSeconds(10);

  private static final OAuth2Error INVALID =
      new OAuth2Error("invalid_token", "The token has been revoked.", null);

  private record Cached(int version, long readAtNanos) {}

  private final UserAccountRepository users;
  private final ConcurrentHashMap<UUID, Cached> versions = new ConcurrentHashMap<>();

  public TokenVersionValidator(UserAccountRepository users) {
    this.users = users;
  }

  @Override
  public OAuth2TokenValidatorResult validate(Jwt token) {
    UUID subject;
    try {
      subject = UUID.fromString(token.getSubject());
    } catch (IllegalArgumentException | NullPointerException ex) {
      // Signed by us but not addressed to anyone we can look up.
      return OAuth2TokenValidatorResult.failure(INVALID);
    }

    Object claim = token.getClaim(JwtService.CLAIM_TOKEN_VERSION);
    if (!(claim instanceof Number presented)) {
      // Issued before the claim existed, or tampered into another shape.
      return OAuth2TokenValidatorResult.failure(INVALID);
    }

    Integer current = currentVersionOf(subject);
    if (current == null || current != presented.intValue()) {
      // A deleted account lands here too, which is the right answer for it.
      return OAuth2TokenValidatorResult.failure(INVALID);
    }
    return OAuth2TokenValidatorResult.success();
  }

  private Integer currentVersionOf(UUID userId) {
    long now = System.nanoTime();
    Cached cached = versions.get(userId);
    if (cached != null && now - cached.readAtNanos() < CACHE_TTL.toNanos()) {
      return cached.version();
    }

    Integer fresh = users.findTokenVersionById(userId).orElse(null);
    if (fresh == null) {
      versions.remove(userId);
      return null;
    }
    versions.put(userId, new Cached(fresh, now));
    return fresh;
  }

  /** Drops the cached version for one account, so a bump is felt on the next request. */
  public void forget(UUID userId) {
    versions.remove(userId);
  }
}
