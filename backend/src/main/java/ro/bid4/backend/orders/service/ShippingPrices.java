package ro.bid4.backend.orders.service;

import ro.bid4.backend.identity.domain.DeliveryMethodType;

public final class ShippingPrices {
  public static final long EASYBOX = 1499;
  public static final long HOME_COURIER = 2299;

  private ShippingPrices() {}

  public static long forType(DeliveryMethodType type) {
    return type == DeliveryMethodType.HOME_COURIER ? HOME_COURIER : EASYBOX;
  }
}
