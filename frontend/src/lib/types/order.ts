import type { Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";
import type { Auction } from "./auction";
import type { Cause } from "./cause";
import type { DeliveryMethodType, PublicUser } from "./user";

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
 * Where the parcel is going, frozen at the moment delivery was chosen.
 *
 * <p>Its own shape rather than a slice of `DeliveryMethod`, and **flat**, because that is what
 * `DeliverySnapshotResponse.java` sends. Derived from the saved method it claimed a nested
 * `homeAddress`, which the API has never had — so a courier order showed no address at all outside
 * the mock world.
 *
 * <p>A copy, not a reference: the saved method may later be edited or deleted, and the record must
 * keep pointing where the parcel was actually sent.
 */
export interface DeliverySnapshot {
  type: DeliveryMethodType;
  /** What the buyer called it, e.g. "Easybox de lângă birou". */
  label: string;
  phone: string;

  /** EASYBOX only. */
  easyboxLockerId?: string;
  lockerName?: string;
  lockerAddress?: string;

  /** HOME_COURIER only, and flat — there is no nested address on the wire. */
  recipientName?: string;
  street?: string;
  city?: string;
  county?: string;
  postalCode?: string;
  addressDetails?: string;
}

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
  /** What the seller receives on release. bid4's cut is the buyer's tax, not a deduction here. */
  sellerShare: Bani;

  deliveryMethod?: DeliverySnapshot;
  status: OrderStatus;

  awb?: string;
  courier?: string;
  /** Mock reference for the generated PDF; a storage key later. Not sent by the API. */
  labelPdfRef?: string;
  /**
   * The courier's own history — **absent** on anything the API returned.
   *
   * <p>`GET /orders/{id}` does not carry it: the scans are their own resource at
   * `GET /orders/{id}/tracking`, because there can be many of them and most screens want none.
   * Only the mock world fills this in, so anything reading it must cope with undefined — it was
   * declared required, and the order page read `.map` on it and threw.
   */
  trackingEvents?: TrackingEvent[];

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
/** What a party agreed to, and when. Evidence, so it is shown rather than implied. */
export interface OrderAgreement {
  kind: "SALE" | "PAYMENT" | "SHIPPING";
  termsVersion: string;
  acceptedAt: ISODateString;
}

/**
 * A document a sale produced, and who it is addressed to.
 *
 * <p>Listed even when it is not yet available: an invoice that is due but not rendered is worth
 * showing as due, and a page that hides it answers "there is no invoice" to somebody looking for
 * one.
 */
export interface OrderDocument {
  kind:
    | "PROFORMA"
    | "INVOICE"
    | "DONATION_RECEIPT"
    | "PAYOUT_STATEMENT"
    | "SHIPPING_LABEL";
  /** Series and number. Absent for documents that carry no series, such as a courier label. */
  number?: string;
  issuedToName: string;
  amount: Bani;
  available: boolean;
  issuedAt: ISODateString;
}

/**
 * One sale with the summaries every order screen needs to name things.
 *
 * <p>Each one is **exactly** what `OrderResponse.java` sends, and no more. This type used to claim
 * a whole `Auction` and two whole `PublicUser`s; the server sent neither, so anything reading
 * `order.auction.category` worked against the mock world and threw against the API. If a field is
 * wanted here, it is added to the DTO and the mapper in the same change.
 *
 * <p>Every summary is nullable. A listing or a cause can be withdrawn after a sale and an account
 * can be closed, none of which invalidates the order — which is precisely the record somebody would
 * then be looking for.
 */
export interface OrderDetail extends Order {
  auction: Pick<Auction, "id" | "title" | "images"> | null;
  buyer: OrderParty | null;
  seller: OrderParty | null;
  cause: Pick<Cause, "id" | "name" | "slug" | "imageUrl"> | null;
  hasOpenDispute: boolean;
}

/** One side of a sale, as the other side may see them. */
export type OrderParty = Pick<
  PublicUser,
  "id" | "displayName" | "username" | "avatarUrl" | "accountType" | "verified"
>;

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
