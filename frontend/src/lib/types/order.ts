import type { Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";
import type { Auction } from "./auction";
import type { Cause } from "./cause";
import type { DeliveryMethodType, PublicUser } from "./user";

export type OrderStatus =
  | "AWAITING_CONFIRMATION"
  | "AWAITING_PAYMENT"
  | "PAYMENT_FAILED"
  | "PAID_HELD"
  | "LABEL_GENERATED"
  | "DROPPED_OFF"
  | "IN_TRANSIT"
  | "ARRIVED_AT_LOCKER"
  | "DELIVERED"
  | "COMPLETED"
  | "DISPUTE_OPEN"
  | "DISPUTE_RESOLVED"
  | "REFUNDED"
  | "CANCELLED";

export const ORDER_FLOW: readonly OrderStatus[] = [
  "AWAITING_CONFIRMATION",
  "AWAITING_PAYMENT",
  "PAID_HELD",
  "LABEL_GENERATED",
  "DROPPED_OFF",
  "IN_TRANSIT",
  "ARRIVED_AT_LOCKER",
  "DELIVERED",
  "COMPLETED",
];

export interface TrackingEvent {
  id: ID;
  status: OrderStatus;
  label: string;
  location?: string;
  at: ISODateString;
}

export interface DeliverySnapshot {
  type: DeliveryMethodType;
  label: string;
  phone: string;

  easyboxLockerId?: string;
  lockerName?: string;
  lockerAddress?: string;

  recipientName?: string;
  street?: string;
  city?: string;
  county?: string;
  postalCode?: string;
  addressDetails?: string;
}

export interface Order {
  id: ID;
  reference: string;
  auctionId: ID;
  buyerId: ID;
  sellerId: ID;
  causeId: ID;

  finalPrice: Bani;
  platformTax: Bani;
  shipping: Bani;
  totalPaid: Bani;
  donationAmount: Bani;
  donationPercent: number;
  sellerShare: Bani;

  deliveryMethod?: DeliverySnapshot;
  status: OrderStatus;

  awb?: string;
  courier?: string;
  labelPdfRef?: string;
  trackingEvents?: TrackingEvent[];

  confirmationDeadline?: ISODateString;
  autoReleaseAt?: ISODateString;
  paymentFailureReason?: string;

  createdAt: ISODateString;
  paidAt?: ISODateString;
  deliveredAt?: ISODateString;
  releasedAt?: ISODateString;
}

export interface OrderAgreement {
  kind: "SALE" | "PAYMENT" | "SHIPPING";
  termsVersion: string;
  acceptedAt: ISODateString;
}

export interface OrderDocument {
  kind:
    | "PROFORMA"
    | "INVOICE"
    | "DONATION_RECEIPT"
    | "PAYOUT_STATEMENT"
    | "SHIPPING_LABEL";
  number?: string;
  issuedToName: string;
  amount: Bani;
  available: boolean;
  issuedAt: ISODateString;
}

export interface OrderDetail extends Order {
  auction: Pick<Auction, "id" | "title" | "images"> | null;
  buyer: OrderParty | null;
  seller: OrderParty | null;
  cause: Pick<Cause, "id" | "name" | "slug" | "imageUrl"> | null;
  hasOpenDispute: boolean;
}

export type OrderParty = Pick<
  PublicUser,
  "id" | "displayName" | "username" | "avatarUrl" | "accountType" | "verified"
>;

export interface ConfirmOrderPayload {
  orderId: ID;
  deliveryMethodId: ID;
}

export interface OrderFilters {
  role?: "BUYER" | "SELLER";
  status?: OrderStatus[];
  q?: string;
  page?: number;
  pageSize?: number;
}
