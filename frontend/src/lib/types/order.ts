import type { Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";
import type { Auction } from "./auction";
import type { Cause } from "./cause";
import type { DeliveryMethod, PublicUser } from "./user";

/**
 * The escrow state machine. Money sits with the platform from PAID_HELD until
 * COMPLETED, and the UI must never imply the seller has already been paid.
 *
 *  AWAITING_CONFIRMATION → AWAITING_PAYMENT → PAID_HELD → LABEL_GENERATED
 *    → DROPPED_OFF → IN_TRANSIT → ARRIVED_AT_LOCKER → DELIVERED → COMPLETED
 *  After payment: DISPUTE_OPEN → DISPUTE_RESOLVED → REFUNDED | COMPLETED
 */
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

/** Happy-path order used to draw the timeline. */
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
  /** Romanian, courier-style wording shown in the timeline. */
  label: string;
  location?: string;
  at: ISODateString;
}

/**
 * Frozen at confirmation time: the saved address may later be edited or deleted,
 * the label must not change.
 */
export type DeliverySnapshot = Omit<DeliveryMethod, "isDefault" | "userId">;

export interface Order {
  id: ID;
  /** Human-facing reference, e.g. "CMD-2026-0417". */
  reference: string;
  auctionId: ID;
  buyerId: ID;
  sellerId: ID;
  causeId: ID;

  // Money, all frozen at close — see computeFees in lib/money.ts.
  finalPrice: Bani;
  platformTax: Bani;
  shipping: Bani;
  totalPaid: Bani;
  donationAmount: Bani;
  donationPercent: number;
  sellerFee: Bani;
  sellerNet: Bani;

  deliveryMethod?: DeliverySnapshot;
  status: OrderStatus;

  awb?: string;
  courier?: string;
  /** Mock reference for the generated PDF; a storage key later. */
  labelPdfRef?: string;
  trackingEvents: TrackingEvent[];

  /** Winner must confirm before this instant or we auto-confirm the default. */
  confirmationDeadline?: ISODateString;
  /** Funds auto-release at this instant unless the buyer disputes. */
  autoReleaseAt?: ISODateString;
  paymentFailureReason?: string;

  createdAt: ISODateString;
  paidAt?: ISODateString;
  deliveredAt?: ISODateString;
  releasedAt?: ISODateString;
}

/** Order plus every join the tracking page needs in one payload. */
export interface OrderDetail extends Order {
  auction: Auction;
  buyer: PublicUser;
  seller: PublicUser;
  cause: Pick<Cause, "id" | "name" | "slug" | "imageUrl" | "category">;
  hasOpenDispute: boolean;
}

export interface ConfirmOrderPayload {
  orderId: ID;
  /** Winner may switch locker/address at confirmation time. */
  deliveryMethodId: ID;
}

export interface OrderFilters {
  role?: "BUYER" | "SELLER";
  status?: OrderStatus[];
  q?: string;
  page?: number;
  pageSize?: number;
}
