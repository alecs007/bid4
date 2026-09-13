import { SHIPPING_PRICES, type Bani } from "@/lib/config";
import type { DeliveryMethod, DeliverySnapshot } from "@/lib/types";

/**
 * Orders carry a copy, not a reference: the saved method may later be edited or
 * deleted, and the label must keep pointing where the parcel was sent. Lives on
 * its own so the seed can use it without importing the store.
 */
export function snapshotDelivery(method: DeliveryMethod): DeliverySnapshot {
  // Flattened, the way the server sends it. The saved method nests the address;
  // the snapshot on the wire does not, and the mock must not offer a screen a
  // shape the API will never produce.
  return {
    type: method.type,
    label: method.label,
    phone: method.phone,
    easyboxLockerId: method.easyboxLockerId,
    lockerName: method.lockerName,
    lockerAddress: method.lockerAddress,
    recipientName: method.homeAddress?.recipientName,
    street: method.homeAddress?.street,
    city: method.homeAddress?.city,
    county: method.homeAddress?.county,
    postalCode: method.homeAddress?.postalCode,
    addressDetails: method.homeAddress?.details,
  };
}

export function shippingPriceFor(method: DeliverySnapshot): Bani {
  return method.type === "EASYBOX"
    ? SHIPPING_PRICES.EASYBOX
    : SHIPPING_PRICES.HOME_COURIER;
}
