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

export type AuctionStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "LIVE"
  | "RESERVED"
  | "SOLD"
  | "CANCELLED";

export const PUBLIC_AUCTION_STATUSES: readonly AuctionStatus[] = [
  "LIVE",
  "RESERVED",
  "SOLD",
  "CANCELLED",
];

export function isCommitted(status: AuctionStatus): boolean {
  return status === "RESERVED" || status === "SOLD";
}

export const OFFERABLE_AUCTION_STATUSES: readonly AuctionStatus[] = [
  "LIVE",
  "RESERVED",
];

export function isOfferable(status: AuctionStatus): boolean {
  return status === "LIVE" || status === "RESERVED";
}

export interface Auction {
  id: ID;
  sellerId: ID;
  causeId: ID;

  title: string;
  description: string;
  images: string[];
  category: AuctionCategoryId;
  condition: ItemCondition;
  weightGrams: number;

  donationPercent: number;

  startingPrice: Bani;
  currentPrice: Bani;
  bidIncrement: Bani;
  reservePrice?: Bani;
  buyNowPrice?: Bani;

  startTime: ISODateString;
  acceptedAt?: ISODateString;
  acceptedAmount?: Bani;
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
  reserveMet: boolean;
  isWatched?: boolean;
  viewerBidStatus?: "WINNING" | "OUTBID" | "ACCEPTED" | "NONE";
  viewerBidAmount?: Bani;
}

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

export interface BidWithBidder extends Omit<Bid, "bidderId"> {
  bidderId?: ID;
  bidderDisplayName?: string;
  bidderAvatarUrl?: string;
  bidderUsername?: string;
  mine?: boolean;
  alias?: string;
}

export interface PlaceBidPayload {
  auctionId: ID;
  amount: Bani;
  acceptedTermsVersion: string;
}

export interface PlaceBidResult {
  bid: Bid;
  auction: Auction;
  boughtNow?: boolean;
}

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

export interface FeaturedAuctions {
  mostWatched: AuctionDetail[];
  latest: AuctionDetail[];
}
