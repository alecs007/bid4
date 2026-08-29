package ro.bid4.backend.catalog.service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.repo.AuctionRepository;

/**
 * Drives the two transitions that happen because time passed rather than because somebody asked.
 *
 * <p>It only chooses what to work on. Each auction is moved by {@link AuctionSettlementService} in
 * its own transaction, which is what keeps one failure from taking a batch with it.
 *
 * <p>Twenty seconds, not one: the page counts down locally, so the only thing the interval controls
 * is how long a finished auction keeps saying "Se închide" before it says who won. A batch ceiling
 * bounds the work per tick — after downtime the backlog is drained over several ticks instead of
 * one very long transaction, and {@code fixedDelay} means a slow tick delays the next rather than
 * overlapping it.
 *
 * <p>Switched off under test, where the service is driven directly and a tick landing mid-assertion
 * would be nondeterminism nobody asked for. See the surefire configuration in pom.xml.
 */
@Component
@ConditionalOnProperty(
    name = "bid4.auctions.clock-enabled",
    havingValue = "true",
    matchIfMissing = true)
public class AuctionClock {

  private static final Logger log = LoggerFactory.getLogger(AuctionClock.class);

  /** How many auctions one tick will move, per transition. */
  private static final int BATCH = 200;

  private final AuctionRepository auctions;
  private final AuctionSettlementService settlement;

  public AuctionClock(AuctionRepository auctions, AuctionSettlementService settlement) {
    this.auctions = auctions;
    this.settlement = settlement;
  }

  @Scheduled(fixedDelay = 20_000)
  public void tick() {
    Instant now = Instant.now();
    // Opening first: an auction whose window opened and closed inside one tick
    // is then closed by the same pass rather than waiting for the next.
    int opened = open(now);
    int settled = close(now);
    if (opened > 0 || settled > 0) {
      log.debug("Auction clock opened {} and closed {}", opened, settled);
    }
  }

  private int open(Instant now) {
    List<UUID> due = auctions.findDueToOpen(AuctionStatus.SCHEDULED, now, PageRequest.of(0, BATCH));
    int moved = 0;
    for (UUID id : due) {
      if (settlement.open(id)) {
        moved++;
      }
    }
    return moved;
  }

  private int close(Instant now) {
    List<UUID> due = auctions.findDueToClose(AuctionStatus.LIVE, now, PageRequest.of(0, BATCH));
    int moved = 0;
    for (UUID id : due) {
      if (settlement.settle(id)) {
        moved++;
      }
    }
    return moved;
  }
}
