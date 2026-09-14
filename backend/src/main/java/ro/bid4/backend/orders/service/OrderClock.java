package ro.bid4.backend.orders.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OrderClock {
  private static final Logger log = LoggerFactory.getLogger(OrderClock.class);

  private final OrderService orders;

  public OrderClock(OrderService orders) {
    this.orders = orders;
  }

  @Scheduled(fixedDelayString = "PT15M", initialDelayString = "PT1M")
  public void tick() {
    try {
      int released = orders.releaseWhatIsDue();
      if (released > 0) {
        log.info("Auto-release: {} orders completed on the buyer's silence", released);
      }
    } catch (RuntimeException failure) {
      log.error("Auto-release sweep failed", failure);
    }

    try {
      int cancelled = orders.cancelWhatHasLapsed();
      if (cancelled > 0) {
        log.info("Expiry: {} orders cancelled, delivery never chosen", cancelled);
      }
    } catch (RuntimeException failure) {
      log.error("Expiry sweep failed", failure);
    }
  }
}
