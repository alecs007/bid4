package ro.bid4.backend.shipping.service;

import java.util.Map;
import java.util.Optional;
import ro.bid4.backend.orders.domain.OrderStatus;

/**
 * The courier's vocabulary, translated into ours.
 *
 * <p>A table rather than a switch on strings scattered through a controller, because this is the
 * one place the two systems meet and it is the first thing to look at when a parcel stops moving. A
 * code that is not here is ignored rather than guessed at: couriers emit far more events than a
 * sale has statuses, and inventing a transition from an unrecognised one is how an order arrives
 * DELIVERED because a van was loaded.
 *
 * <p>Sameday's own codes go here when the integration lands. These are the canonical four the
 * journey is built from, so a provider whose codes differ needs only this map changed.
 */
public final class CourierStatuses {

  private static final Map<String, OrderStatus> KNOWN =
      Map.of(
          "PICKED_UP", OrderStatus.DROPPED_OFF,
          "IN_TRANSIT", OrderStatus.IN_TRANSIT,
          "AT_LOCKER", OrderStatus.ARRIVED_AT_LOCKER,
          "DELIVERED", OrderStatus.DELIVERED);

  private CourierStatuses() {}

  /** Empty for anything not in the table, which the caller treats as "nothing to record". */
  public static Optional<OrderStatus> of(String code) {
    return code == null ? Optional.empty() : Optional.ofNullable(KNOWN.get(code.toUpperCase()));
  }
}
