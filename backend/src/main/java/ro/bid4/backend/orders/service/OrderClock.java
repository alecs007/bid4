package ro.bid4.backend.orders.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * The two deadlines a sale has, actually running.
 *
 * <p>Both were written and neither was scheduled: {@code releaseWhatIsDue} existed with no caller,
 * so the three-day auto-release that stops a seller being unpaid by a silent buyer had never once
 * fired outside a test. A deadline nothing checks is not a deadline.
 *
 * <p>Quarter-hourly rather than daily. Both windows are measured in days, so the precision is not
 * the point — being wrong by at most fifteen minutes rather than by up to a day is, because the
 * figure the thread shows a waiting seller should not be visibly stale.
 *
 * <p>Each sweep is its own transaction inside the service. One order that cannot be settled must
 * not take the rest of the batch with it.
 */
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
