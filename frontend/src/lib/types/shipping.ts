import type { ID, ISODateString } from "./common";
import type { DeliveryMethodType } from "./user";

export interface EasyboxLocker {
  id: string;
  name: string;
  address: string;
  city: string;
  county: string;
  availableCompartments: number;
  scheduleNote: string;
}

export interface ShippingParty {
  name: string;
  phone: string;
  addressLines: string[];
}

export interface ShippingLabelData {
  awb: string;
  courier: string;
  serviceName: string;
  qrPayload: string;
  trackingUrl: string;

  orderId: ID;
  orderReference: string;

  sender: ShippingParty;
  recipient: ShippingParty;

  deliveryType: DeliveryMethodType;
  lockerId?: string;
  lockerName?: string;

  weightGrams: number;
  itemTitle: string;
  issuedAt: ISODateString;

  donationNote?: string;
}

export interface GenerateLabelPayload {
  orderId: ID;
}
