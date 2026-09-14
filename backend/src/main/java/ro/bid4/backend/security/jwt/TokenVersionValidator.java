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

@Component
public class TokenVersionValidator implements OAuth2TokenValidator<Jwt> {
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
      return OAuth2TokenValidatorResult.failure(INVALID);
    }

    Object claim = token.getClaim(JwtService.CLAIM_TOKEN_VERSION);
    if (!(claim instanceof Number presented)) {
      return OAuth2TokenValidatorResult.failure(INVALID);
    }

    Integer current = currentVersionOf(subject);
    if (current == null || current != presented.intValue()) {
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

  public void forget(UUID userId) {
    versions.remove(userId);
  }
}
