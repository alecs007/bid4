package ro.bid4.backend.identity.service;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.common.config.Bid4Properties;
import ro.bid4.backend.identity.repo.RefreshTokenRepository;

/**
 * Removes refresh tokens that expired long enough ago to be of no further use.
 *
 * <p>Nothing deleted here can affect a sign-in. Rotation leaves a spent row behind on every
 * exchange, so an account that stays signed in accumulates one row per fifteen minutes of use
 * forever; the table only ever grew. What is kept past expiry is the trail — when a session
 * started, from which address, on which client — and {@code bid4.jwt.refresh-token-retention} is
 * how long that is worth keeping.
 *
 * <p>Nightly and off-peak. A delete of rows nobody reads does not need to compete with traffic.
 */
@Component
public class RefreshTokenSweeper {

  private static final Logger log = LoggerFactory.getLogger(RefreshTokenSweeper.class);

  private final RefreshTokenRepository refreshTokens;
  private final Bid4Properties properties;

  public RefreshTokenSweeper(RefreshTokenRepository refreshTokens, Bid4Properties properties) {
    this.refreshTokens = refreshTokens;
    this.properties = properties;
  }

  @Scheduled(cron = "0 20 3 * * *")
  @Transactional
  public void sweep() {
    Instant cutoff = Instant.now().minus(properties.jwt().refreshTokenRetention());
    int removed = refreshTokens.deleteExpiredBefore(cutoff);
    if (removed > 0) {
      log.info("Swept {} refresh tokens expired before {}", removed, cutoff);
    }
  }
}
