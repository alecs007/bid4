package ro.bid4.backend.shipping.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import ro.bid4.backend.orders.service.OrderService;

/**
 * A courier's scan, turned into a fact about a sale.
 *
 * <p>This is where the courier's vocabulary stops. The web layer above it speaks only the
 * provider's own strings and the order service below it speaks only ours, so neither has to know
 * about the other — and the controller never touches an {@code OrderStatus}, which is what keeps
 * the api layer free of the domain.
 */
@Service
public class CourierScans {

  private static final Logger log = LoggerFactory.getLogger(CourierScans.class);

  private final OrderService orders;

  public CourierScans(OrderService orders) {
    this.orders = orders;
  }

  /**
   * Records one scan, if it is one a sale tracks and the parcel is one we know.
   *
   * <p>Both misses are ordinary rather than exceptional. A courier emits far more events than a
   * sale has statuses, and an AWB we have never heard of is their bookkeeping, not a failure here —
   * so both are logged and accepted, because anything else makes the courier retry forever.
   */
  public void record(
      String eventId, String awb, String courierStatus, String location, String description) {
    CourierStatuses.of(courierStatus)
        .ifPresentOrElse(
            status -> {
              String label =
                  description == null || description.isBlank() ? status.name() : description;
              if (!orders.applyCourierScan(awb, status, label, location, eventId)) {
                log.info("Courier scan for an unknown AWB {}", awb);
              }
            },
            () -> log.debug("Courier status {} is not one a sale tracks", courierStatus));
  }
}
