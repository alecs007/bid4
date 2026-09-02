import type { AuctionCategoryId, Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";
import type { Cause } from "./cause";
import type { PublicUser } from "./user";

export type ItemCondition =
  | "NEW"
  | "LIKE_NEW"
  | "VERY_GOOD"
  | "GOOD"
  | "USED";

/**
 * DRAFT          — being composed by the seller.
 * PENDING_REVIEW — staff spot-check before it goes live.
 * LIVE           — taking offers, for as long as the seller leaves it up.
 * RESERVED       — the seller took an offer and is waiting to be paid. Reversible.
 * SOLD           — paid for. The seller now owes a parcel, and the row cannot be withdrawn.
 * CANCELLED      — pulled by the seller or staff.
 *
 * There is no state for "the time ran out". A listing has no clock: it stays open until its
 * seller settles it or takes it down.
 */
export type AuctionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "LIVE"
  | "RESERVED"
  | "SOLD"
  | "CANCELLED";

/** The states a stranger may see. A draft and a listing under review are private. */
export const PUBLIC_AUCTION_STATUSES: readonly AuctionStatus[] = [
  "LIVE",
  "RESERVED",
  "SOLD",
  "CANCELLED",
];

/** Past the point of no return: a buyer is attached, so the listing cannot be withdrawn. */
export function isCommitted(status: AuctionStatus): boolean {
  return status === "RESERVED" || status === "SOLD";
}

/**
 * The statuses a buyer can still act on, and the only ones /licitatii lists.
 *
 * <p>RESERVED belongs here. The seller has taken an offer but nobody has paid, so they may still
 * release it and take a better one — which makes an offer against a reserved listing worth
 * making. SOLD is where the room closes.
 */
export const OFFERABLE_AUCTION_STATUSES: readonly AuctionStatus[] = [
  "LIVE",
  "RESERVED",
];

export function isOfferable(status: AuctionStatus): boolean {
  return status === "LIVE" || status === "RESERVED";
}

/**
 * An auction is the object and the sale together. There is no separate product:
 * nothing on this platform exists outside the auction that offers it, so a
 * second entity would only ever be one row with one owner.
 */
export interface Auction {
  id: ID;
  sellerId: ID;
  causeId: ID;

  /* --- what is being sold ----------------------------------------------- */
  title: string;
  description: string;
  images: string[];
  category: AuctionCategoryId;
  condition: ItemCondition;
  /** Drives the courier price band on the shipping label. */
  weightGrams: number;

  /* --- the sale --------------------------------------------------------- */
  /** 0–100. The share of the hammer price that goes to the cause. */
  donationPercent: number;

  startingPrice: Bani;
  currentPrice: Bani;
  /**
   * The smallest raise, derived from the asking price rather than chosen. Read-only to the
   * seller: it comes back on every listing, but there is no field for it on the way in.
   */
  bidIncrement: Bani;
  /** Hidden from buyers; only "rezerva a fost atinsă" is shown. */
  reservePrice?: Bani;
  /**
   * The price that takes the item outright. Public, unlike the reserve — an offer nobody can
   * take without being told the number. Absent when the seller named none, which is the
   * ordinary case.
   */
  buyNowPrice?: Bani;

  /** When it went up. There is no closing time: a listing runs until it is settled. */
  startTime: ISODateString;
  /** When the seller took an offer. Absent while the listing is still open. */
  acceptedAt?: ISODateString;
  /**
   * What the accepted offer was worth. Not the same as `currentPrice`: a reserved listing goes on
   * taking offers, so the highest can climb past the one the seller took.
   */
  acceptedAmount?: Bani;
  /** When the parcel is due. Set only once the sale has been paid for. */
  dispatchDeadline?: ISODateString;

  status: AuctionStatus;
  winnerId?: ID;
  bidCount: number;
  watcherCount: number;

  createdAt: ISODateString;
}

export interface AuctionDetail extends Auction {
  seller: PublicUser;
  cause: Pick<
    Cause,
    | "id"
    | "name"
    | "slug"
    | "shortDescription"
    | "imageUrl"
    | "category"
    | "goalAmount"
    | "raisedAmount"
    | "status"
  >;
  /** True when the reserve exists and has been met. */
  reserveMet: boolean;
  /** Set for the signed-in user only. */
  isWatched?: boolean;
  viewerBidStatus?: "WINNING" | "OUTBID" | "NONE";
}

/**
 * ACCEPTED sits between WINNING and WON: the seller has taken this offer and the buyer has not
 * paid yet. It goes back to OUTBID if the seller releases it, and on to WON if they pay.
 */
export type BidStatus =
  | "ACTIVE"
  | "OUTBID"
  | "WINNING"
  | "ACCEPTED"
  | "WON"
  | "LOST";

export interface Bid {
  id: ID;
  auctionId: ID;
  bidderId: ID;
  amount: Bani;
  createdAt: ISODateString;
  status: BidStatus;
}

export interface BidWithBidder extends Bid {
  /** Public bid history is pseudonymised: "Andrei M." */
  bidderDisplayName: string;
  bidderAvatarUrl: string;
  bidderUsername: string;
}

export interface PlaceBidPayload {
  auctionId: ID;
  amount: Bani;
}

export interface PlaceBidResult {
  bid: Bid;
  auction: Auction;
  /**
   * Set when the offer reached `buyNowPrice` and took the item there and then. The auction in
   * the same response comes back RESERVED, not SOLD: the seller is bound by the price they
   * published, but nobody has paid yet.
   */
  boughtNow?: boolean;
}

/**
 * Everything the seller supplies. The rest is derived or assigned on create.
 *
 * <p>Three things a seller used to fill in are gone: the bid step is read off the asking price,
 * the listing opens now, and there is no end to choose.
 */
export type CreateAuctionPayload = Pick<
  Auction,
  | "title"
  | "description"
  | "images"
  | "category"
  | "condition"
  | "weightGrams"
  | "causeId"
  | "donationPercent"
  | "startingPrice"
> & { reservePrice?: Bani; buyNowPrice?: Bani };

export interface AuctionFilters {
  q?: string;
  status?: readonly AuctionStatus[];
  category?: AuctionCategoryId[];
  /** The seller's five choices, not free text. */
  condition?: readonly ItemCondition[];
  causeId?: ID;
  sellerId?: ID;
  minPrice?: Bani;
  maxPrice?: Bani;
  minDonationPercent?: number;
  sort?: AuctionSort;
  page?: number;
  pageSize?: number;
}

export type AuctionSort =
  | "NEWEST"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "MOST_BIDS"
  | "DONATION_DESC";

/** The two homepage rows, as `GET /auctions/featured` answers them. */
export interface FeaturedAuctions {
  /** What the page leads with now that nothing is about to close. */
  mostWatched: AuctionDetail[];
  /** Newest first. The row below asks what is new, where the one above asks what is doing well. */
  latest: AuctionDetail[];
}
