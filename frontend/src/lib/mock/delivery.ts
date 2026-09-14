import { SHIPPING_PRICES, type Bani } from "@/lib/config";
import type { DeliveryMethod, DeliverySnapshot } from "@/lib/types";

export function snapshotDelivery(method: DeliveryMethod): DeliverySnapshot {
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
