import { SHIPPING_PRICES, type Bani } from "@/lib/config";
import type { DeliveryMethod, DeliverySnapshot } from "@/lib/types";

/**
 * Freezes a delivery method onto an order. The user may later edit or delete
 * the saved method; the shipping label must keep pointing where the parcel was
 * actually sent, so orders carry a copy rather than a reference.
 *
 * Lives on its own so both the seed and the store can use it without the seed
 * importing the store (which imports the seed).
 */
export function snapshotDelivery(method: DeliveryMethod): DeliverySnapshot {
  return {
    id: method.id,
    type: method.type,
    label: method.label,
    easyboxLockerId: method.easyboxLockerId,
    lockerName: method.lockerName,
    lockerAddress: method.lockerAddress,
    homeAddress: method.homeAddress,
    phone: method.phone,
  };
}

export function shippingPriceFor(method: DeliverySnapshot): Bani {
  return method.type === "EASYBOX"
    ? SHIPPING_PRICES.EASYBOX
    : SHIPPING_PRICES.HOME_COURIER;
}
