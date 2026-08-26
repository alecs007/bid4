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
 * SCHEDULED      — approved, `startTime` is in the future.
 * LIVE           — accepting bids.
 * ENDED          — clock ran out, settlement in progress.
 * SOLD           — had a winner above reserve; an Order exists.
 * UNSOLD         — no bids, or reserve not met.
 * CANCELLED      — pulled by the seller or staff.
 */
export type AuctionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "SCHEDULED"
  | "LIVE"
  | "ENDED"
  | "SOLD"
  | "UNSOLD"
  | "CANCELLED";

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
  bidIncrement: Bani;
  /** Hidden from buyers; only "rezerva a fost atinsă" is shown. */
  reservePrice?: Bani;
  /**
   * The price that ends the auction outright. Public, unlike the reserve — an
   * offer nobody can take without being told the number. Absent when the seller
   * named none.
   */
  buyNowPrice?: Bani;

  startTime: ISODateString;
  endTime: ISODateString;
  /** A bid inside this window at the end pushes `endTime` out. */
  antiSnipeSeconds: number;

  status: AuctionStatus;
  winnerId?: ID;
  bidCount: number;
  watcherCount: number;
  /** How many times `endTime` was pushed out by anti-sniping. */
  extensionCount: number;

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

export type BidStatus = "ACTIVE" | "OUTBID" | "WINNING" | "WON" | "LOST";

export interface Bid {
  id: ID;
  auctionId: ID;
  bidderId: ID;
  amount: Bani;
  createdAt: ISODateString;
  status: BidStatus;
  /** True when this bid pushed `endTime` out. Shown in the history. */
  triggeredExtension?: boolean;
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
  /** Set when the bid triggered anti-snipe, so the UI can celebrate it. */
  extendedBySeconds?: number;
  /**
   * Set when the offer reached `buyNowPrice` and took the item there and then.
   * The auction in the same response is already SOLD.
   */
  boughtNow?: boolean;
}

/** Everything the seller supplies. The rest is derived or assigned on create. */
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
  | "bidIncrement"
  | "startTime"
  | "endTime"
  | "antiSnipeSeconds"
> & { reservePrice?: Bani; buyNowPrice?: Bani };

export interface AuctionFilters {
  q?: string;
  status?: AuctionStatus[];
  category?: AuctionCategoryId[];
  causeId?: ID;
  sellerId?: ID;
  minPrice?: Bani;
  maxPrice?: Bani;
  minDonationPercent?: number;
  endingSoon?: boolean;
  sort?: AuctionSort;
  page?: number;
  pageSize?: number;
}

export type AuctionSort =
  | "ENDING_SOON"
  | "NEWEST"
  | "PRICE_ASC"
  | "PRICE_DESC"
  | "MOST_BIDS"
  | "DONATION_DESC";
