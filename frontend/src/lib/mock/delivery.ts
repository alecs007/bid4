import { SHIPPING_PRICES, type Bani } from "@/lib/config";
import type { DeliveryMethod, DeliverySnapshot } from "@/lib/types";

/**
 * Orders carry a copy, not a reference: the saved method may later be edited or
 * deleted, and the label must keep pointing where the parcel was sent. Lives on
 * its own so the seed can use it without importing the store.
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
