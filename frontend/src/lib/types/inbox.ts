import type { Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";
import type { OrderStatus } from "./order";
import type { PublicUser } from "./user";

/**
 * The inbox: one conversation per (listing, buyer), and one stream inside it.
 *
 * <p>A buyer's question, the seller's answer, and every step of the sale that follows are items in
 * the same list. The questions that led to a sale end up directly above it, which is where anybody
 * looks when the sale goes wrong.
 */

export type ConversationKind = "LISTING" | "SUPPORT";

/**
 * TEXT and IMAGE have an author; SYSTEM and EVENT do not.
 *
 * EVENT is a step of a sale. Its buttons come from the order's *current* status, never from the
 * item — so an event whose moment has passed draws as a record, and only the one matching the
 * current status can be acted on. The payload is a frozen snapshot, for display only.
 */
export type ThreadItemKind = "TEXT" | "IMAGE" | "SYSTEM" | "EVENT";

/** Why a message was held up as an attempt to move the deal off bid4. */
export type FlaggedReason = "PHONE_NUMBER" | "EMAIL_ADDRESS" | "PAYMENT_DETAILS";

export interface ThreadItem {
  id: ID;
  kind: ThreadItemKind;
  senderId?: ID;
  /** Whether the reader wrote it. Answered by the server, which already knows who is asking. */
  mine: boolean;
  body?: string;
  imageUrls: string[];
  /** Phase two. Names the step of the sale this item records. */
  eventType?: string;
  /** The order's status when the item was written — not what it is now. */
  orderStatus?: OrderStatus;
  payload?: Record<string, string>;
  flaggedReason?: FlaggedReason;
  createdAt: ISODateString;
}

export interface Conversation {
  id: ID;
  kind: ConversationKind;
  listingId?: ID;
  listingTitle?: string;
  listingImageUrl?: string;
  listingPrice: Bani;
  /** The one name the row shows: the reader is always the other party. */
  otherParty?: PublicUser;
  /** Set when an offer is accepted. Null while the thread is only a conversation. */
  orderId?: ID;
  lastItem?: ThreadItem;
  unreadCount: number;
  archived: boolean;
  muted: boolean;
  lastItemAt: ISODateString;
}

export interface Thread {
  conversation: Conversation;
  /** Newest first, the way the index runs. The view reverses them to draw. */
  items: ThreadItem[];
  nextCursor?: string;
}

export interface Notification {
  id: ID;
  /** Interpolated into Romanian copy here, so wording can change without rewriting history. */
  type: string;
  payload: Record<string, string>;
  /** Always relative, and refused by the server if it is not. */
  deepLink?: string;
  read: boolean;
  createdAt: ISODateString;
}

/**
 * A keyset page. No page number and no total: both are meaningless on a list that is appended to
 * while it is being read, and the count would cost more than the page.
 */
export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface UnreadCounts {
  /** Threads with something waiting, not items waiting — a number somebody can act on. */
  messages: number;
  notifications: number;
}

export interface SendMessageInput {
  body?: string;
  /** Ids from POST /uploads/images. Nothing is uploaded through the send endpoint. */
  imageRefs?: ID[];
}
