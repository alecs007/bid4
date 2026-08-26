import type { ID, ISODateString } from "./common";
import type { DeliveryMethodType } from "./user";

/** A locker as returned by the courier's locker directory. */
export interface EasyboxLocker {
  id: string;
  name: string;
  address: string;
  city: string;
  county: string;
  /** Free compartments right now — shown as a friendly availability hint. */
  availableCompartments: number;
  scheduleNote: string;
}

export interface ShippingParty {
  name: string;
  phone: string;
  /** Multi-line address block already formatted for print. */
  addressLines: string[];
}

export interface ShippingLabelData {
  awb: string;
  courier: string;
  serviceName: string;
  /** Encoded into the QR code: AWB + tracking URL. */
  qrPayload: string;
  trackingUrl: string;

  orderId: ID;
  orderReference: string;

  sender: ShippingParty;
  recipient: ShippingParty;

  deliveryType: DeliveryMethodType;
  /** EASYBOX only — printed large, the courier scans against it. */
  lockerId?: string;
  lockerName?: string;

  weightGrams: number;
  productTitle: string;
  issuedAt: ISODateString;

  /** Warm one-liner: "Din această comandă, 120,00 lei merg către ...". */
  donationNote?: string;
}

export interface GenerateLabelPayload {
  orderId: ID;
}
