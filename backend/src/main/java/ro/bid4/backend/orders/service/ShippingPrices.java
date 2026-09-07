package ro.bid4.backend.orders.service;

import ro.bid4.backend.identity.domain.DeliveryMethodType;

/**
 * What delivery costs, in bani.
 *
 * <p>Flat per type until a courier is wired up in phase four, and quoted on the listing before
 * anybody bids, so the buyer's total is knowable before they commit to it. Mirrors SHIPPING_PRICES
 * in frontend/src/lib/config.ts.
 */
public final class ShippingPrices {

  public static final long EASYBOX = 1499;
  public static final long HOME_COURIER = 2299;

  private ShippingPrices() {}

  public static long forType(DeliveryMethodType type) {
    return type == DeliveryMethodType.HOME_COURIER ? HOME_COURIER : EASYBOX;
  }
}
