package ro.bid4.backend.identity.service;

import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.common.config.Bid4Properties;
import ro.bid4.backend.identity.repo.RefreshTokenRepository;

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
