package ro.bid4.backend.shipping.service;

import java.util.Map;
import java.util.Optional;
import ro.bid4.backend.orders.domain.OrderStatus;

public final class CourierStatuses {
  private static final Map<String, OrderStatus> KNOWN =
      Map.of(
          "PICKED_UP", OrderStatus.DROPPED_OFF,
          "IN_TRANSIT", OrderStatus.IN_TRANSIT,
          "AT_LOCKER", OrderStatus.ARRIVED_AT_LOCKER,
          "DELIVERED", OrderStatus.DELIVERED);

  private CourierStatuses() {}

  public static Optional<OrderStatus> of(String code) {
    return code == null ? Optional.empty() : Optional.ofNullable(KNOWN.get(code.toUpperCase()));
  }
}
