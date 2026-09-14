package ro.bid4.backend.shipping.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import ro.bid4.backend.orders.service.OrderService;

@Service
public class CourierScans {
  private static final Logger log = LoggerFactory.getLogger(CourierScans.class);

  private final OrderService orders;

  public CourierScans(OrderService orders) {
    this.orders = orders;
  }

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
