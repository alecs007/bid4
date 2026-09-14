import type { Bani } from "@/lib/config";
import type { ID, ISODateString } from "./common";
import type { OrderStatus } from "./order";
import type { PublicUser } from "./user";

export type ConversationKind = "LISTING" | "SUPPORT";

export type ThreadItemKind = "TEXT" | "IMAGE" | "SYSTEM" | "EVENT";

export type FlaggedReason = "PHONE_NUMBER" | "EMAIL_ADDRESS" | "PAYMENT_DETAILS";

export interface ThreadItem {
  id: ID;
  kind: ThreadItemKind;
  senderId?: ID;
  mine: boolean;
  body?: string;
  imageUrls: string[];
  eventType?: string;
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
  otherParty?: PublicUser;
  viewerRole?: "BUYER" | "SELLER";
  orderId?: ID;
  lastItem?: ThreadItem;
  unreadCount: number;
  archived: boolean;
  muted: boolean;
  lastItemAt: ISODateString;
}

export interface Thread {
  conversation: Conversation;
  items: ThreadItem[];
  nextCursor?: string;
}

export interface Notification {
  id: ID;
  type: string;
  payload: Record<string, string>;
  deepLink?: string;
  read: boolean;
  createdAt: ISODateString;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

export interface UnreadCounts {
  messages: number;
  notifications: number;
}

export interface SendMessageInput {
  body?: string;
  imageRefs?: ID[];
}
