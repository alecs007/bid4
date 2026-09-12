import { USE_MOCK } from "@/lib/config";
import {
  badRequest,
  commit,
  delay,
  getWorld,
  maybeFailRead,
  nextId,
  notFound,
} from "@/lib/mock/store";
import type {
  Conversation,
  CursorPage,
  FlaggedReason,
  ID,
  Notification,
  SendMessageInput,
  Thread,
  ThreadItem,
  UnreadCounts,
} from "@/lib/types";

import { currentMockUserId } from "./auth";
import { http } from "./http";

/**
 * The inbox.
 *
 * TODO(backend): the real endpoints are live — /inbox/conversations, /inbox/notifications,
 * /inbox/unread and the SSE stream at /inbox/stream. What is still to come is phase two, when an
 * accepted offer writes EVENT items into the same thread and the deal is driven from inside it.
 *
 * The mock keeps its own conversations in localStorage so the Vercel demo can hold a conversation
 * with itself. It reproduces the two rules the server enforces rather than only the happy path:
 * a thread is opened from a listing and never from a person, and a message that hands over a phone
 * number is delivered and marked rather than dropped.
 */

const LIST_PAGE = 20;
const THREAD_PAGE = 30;

/** GET /inbox/conversations */
export async function listConversations(
  cursor?: string,
  archived = false,
): Promise<CursorPage<Conversation>> {
  if (!USE_MOCK) {
    const query = new URLSearchParams();
    if (cursor) query.set("cursor", cursor);
    if (archived) query.set("archived", "true");
    const suffix = query.size ? `?${query}` : "";
    return http<CursorPage<Conversation>>(`/inbox/conversations${suffix}`);
  }

  await delay();
  maybeFailRead("conversațiile");
  const me = currentMockUser();
  if (!cursor && !archived) ensureWelcome(me);
  const world = getWorld();

  // bid4's own thread first, then everything else by when it last moved. The
  // server pins it the same way and for the same reason — see InboxService.list.
  const rows = world.conversations
    .filter((item) => item.buyerId === me || item.sellerId === me)
    .filter((item) => Boolean(item.archived) === archived)
    .sort((a, b) => {
      const support = Number(b.kind === "SUPPORT") - Number(a.kind === "SUPPORT");
      return support || b.lastItemAt.localeCompare(a.lastItemAt);
    });

  const start = cursor ? rows.findIndex((row) => row.id === cursor) + 1 : 0;
  const page = rows.slice(start, start + LIST_PAGE);

  return {
    items: page.map((row) => decorate(row, me)),
    nextCursor:
      start + LIST_PAGE < rows.length ? page[page.length - 1]?.id : undefined,
  };
}

/** GET /inbox/conversations/{id} */
export async function getThread(conversationId: ID): Promise<Thread> {
  if (!USE_MOCK) return http<Thread>(`/inbox/conversations/${conversationId}`);

  await delay();
  const me = currentMockUser();
  const conversation = mine(conversationId, me);
  const items = itemsOf(conversationId, me);

  return {
    conversation: decorate(conversation, me),
    items: items.slice(0, THREAD_PAGE),
    nextCursor: items.length > THREAD_PAGE ? items[THREAD_PAGE - 1]?.id : undefined,
  };
}

/** GET /inbox/conversations/{id}/items */
export async function listItems(
  conversationId: ID,
  cursor?: string,
): Promise<CursorPage<ThreadItem>> {
  if (!USE_MOCK) {
    const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return http<CursorPage<ThreadItem>>(
      `/inbox/conversations/${conversationId}/items${suffix}`,
    );
  }

  await delay();
  const me = currentMockUser();
  mine(conversationId, me);
  const all = itemsOf(conversationId, me);
  const start = cursor ? all.findIndex((item) => item.id === cursor) + 1 : 0;
  const page = all.slice(start, start + THREAD_PAGE);

  return {
    items: page,
    nextCursor:
      start + THREAD_PAGE < all.length ? page[page.length - 1]?.id : undefined,
  };
}

/**
 * POST /inbox/conversations
 *
 * Opens the thread about a listing, or hands back the one already there — asking a second question
 * is not a second conversation. A buyer does not have to have bid: a question is how bidding
 * starts.
 */
export async function openThread(
  listingId: ID,
  message?: string,
): Promise<Thread> {
  if (!USE_MOCK) {
    return http<Thread>("/inbox/conversations", {
      method: "POST",
      body: { listingId, message },
    });
  }

  await delay();
  const world = getWorld();
  const me = currentMockUser();
  const listing = world.auctions.find((item) => item.id === listingId);
  if (!listing) notFound("Anunțul");
  if (listing.sellerId === me) {
    badRequest("Nu poți deschide o conversație la propriul anunț.");
  }

  let conversation = world.conversations.find(
    (item) => item.listingId === listingId && item.buyerId === me,
  );
  if (!conversation) {
    conversation = {
      id: nextId("conv"),
      kind: "LISTING",
      listingId,
      buyerId: me,
      sellerId: listing.sellerId,
      archived: false,
      muted: false,
      unread: {},
      lastItemAt: new Date().toISOString(),
    };
    world.conversations.push(conversation);
  }

  if (message && message.trim()) {
    append(conversation.id, me, message.trim(), []);
  }
  commit();
  return getThread(conversation.id);
}

/** POST /inbox/conversations/{id}/items */
export async function sendMessage(
  conversationId: ID,
  input: SendMessageInput,
): Promise<ThreadItem> {
  if (!USE_MOCK) {
    return http<ThreadItem>(`/inbox/conversations/${conversationId}/items`, {
      method: "POST",
      body: input,
    });
  }

  await delay();
  const me = currentMockUser();
  mine(conversationId, me);

  const body = (input.body ?? "").trim();
  const images = input.imageRefs ?? [];
  if (!body && images.length === 0) badRequest("Mesajul este gol.");

  const item = append(conversationId, me, body, images);
  commit();
  return item;
}

/** PUT /inbox/conversations/{id}/read */
export async function markThreadRead(conversationId: ID): Promise<void> {
  if (!USE_MOCK) {
    await http<void>(`/inbox/conversations/${conversationId}/read`, {
      method: "PUT",
    });
    return;
  }

  await delay();
  const me = currentMockUser();
  const conversation = mine(conversationId, me);
  conversation.unread[me] = 0;
  commit();
}

/** PUT|DELETE /inbox/conversations/{id}/archive */
export async function setArchived(
  conversationId: ID,
  archived: boolean,
): Promise<void> {
  if (!USE_MOCK) {
    await http<void>(`/inbox/conversations/${conversationId}/archive`, {
      method: archived ? "PUT" : "DELETE",
    });
    return;
  }

  await delay();
  const conversation = mine(conversationId, currentMockUser());
  conversation.archived = archived;
  commit();
}

/** GET /inbox/notifications */
export async function listNotifications(
  cursor?: string,
): Promise<CursorPage<Notification>> {
  if (!USE_MOCK) {
    const suffix = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return http<CursorPage<Notification>>(`/inbox/notifications${suffix}`);
  }

  await delay();
  maybeFailRead("notificările");
  const me = currentMockUser();
  if (!cursor) ensureWelcome(me);
  const world = getWorld();
  const rows = world.notifications
    .filter((item) => item.userId === me)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { items: rows.map(stripOwner), nextCursor: undefined };
}

/** PUT /inbox/notifications/read */
export async function markNotificationsRead(id?: ID): Promise<void> {
  if (!USE_MOCK) {
    await http<void>(
      id ? `/inbox/notifications/${id}/read` : "/inbox/notifications/read",
      { method: "PUT" },
    );
    return;
  }

  await delay();
  const world = getWorld();
  const me = currentMockUser();
  for (const item of world.notifications) {
    if (item.userId === me && (!id || item.id === id)) item.read = true;
  }
  commit();
}

/**
 * POST /inbox/stream/ticket
 *
 * Single-use, thirty seconds. EventSource cannot send an Authorization header, so the stream is
 * opened with this instead of with the access token — which has no business in a URL.
 */
export async function streamTicket(): Promise<string | null> {
  if (USE_MOCK) return null;
  const { ticket } = await http<{ ticket: string }>("/inbox/stream/ticket", {
    method: "POST",
  });
  return ticket;
}

/** GET /inbox/unread */
export async function getUnreadCounts(): Promise<UnreadCounts> {
  if (!USE_MOCK) return http<UnreadCounts>("/inbox/unread");

  await delay();
  const world = getWorld();
  const me = currentMockUser();

  return {
    messages: world.conversations.filter(
      (item) =>
        !item.archived &&
        (item.buyerId === me || item.sellerId === me) &&
        (item.unread[me] ?? 0) > 0,
    ).length,
    notifications: world.notifications.filter(
      (item) => item.userId === me && !item.read,
    ).length,
  };
}

/* --- the mock's own half ---------------------------------------------------- */

/** Word for word what `Welcome.java` writes, so the demo says what the real thing says. */
const WELCOME =
  "Bun venit pe bid4! În această conversație ne poți adresa orice întrebare despre platformă, " +
  "licitații sau comenzi. Echipa bid4 îți stă la dispoziție și îți va răspunde în cel mai scurt " +
  "timp.";

/**
 * Neither half of the inbox is ever empty, exactly as on the server.
 *
 * <p>Written on first read rather than when the world is seeded, because a world seeded before this
 * existed still has to get it — and because it is the same shape the server uses, which is what
 * keeps the demo honest about what the real thing does.
 */
function ensureWelcome(me: ID): void {
  const world = getWorld();

  if (!world.conversations.some((item) => item.kind === "SUPPORT" && item.buyerId === me)) {
    const id = nextId("conv");
    const opened = Date.now();
    world.conversations.push({
      id,
      kind: "SUPPORT",
      buyerId: me,
      archived: false,
      muted: false,
      unread: { [me]: 1 },
      lastItemAt: new Date(opened).toISOString(),
    });
    world.threadItems.push({
      conversationId: id,
      id: nextId("item"),
      kind: "SYSTEM",
      mine: false,
      body: WELCOME,
      imageUrls: [],
      createdAt: new Date(opened).toISOString(),
    });
  }

  if (!world.notifications.some((item) => item.userId === me && item.type === "WELCOME")) {
    world.notifications.push({
      id: nextId("notif"),
      userId: me,
      type: "WELCOME",
      payload: {},
      deepLink: "/cont/inbox",
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  commit();
}

/**
 * The same check the server makes, and for the same reason: a conversation id names something that
 * may or may not be any of the reader's business, so it is never enough on its own.
 */
function mine(conversationId: ID, me: ID) {
  const conversation = getWorld().conversations.find(
    (item) => item.id === conversationId,
  );
  // Not "forbidden": a refusal that tells them the id is real is a refusal
  // worth probing.
  if (
    !conversation ||
    (conversation.buyerId !== me && conversation.sellerId !== me)
  ) {
    notFound("Conversația");
  }
  return conversation;
}

function append(
  conversationId: ID,
  senderId: ID,
  body: string,
  imageRefs: ID[],
): ThreadItem {
  const world = getWorld();
  const conversation = world.conversations.find(
    (item) => item.id === conversationId,
  )!;
  const at = new Date().toISOString();

  const item: ThreadItem & { conversationId: ID } = {
    conversationId,
    id: nextId("item"),
    kind: imageRefs.length ? "IMAGE" : "TEXT",
    senderId,
    mine: true,
    body: body || undefined,
    imageUrls: imageRefs,
    flaggedReason: offPlatform(body),
    createdAt: at,
  };

  world.threadItems.push(item);
  conversation.lastItemAt = at;
  // Nobody to count it against on a support thread, where the other side is
  // bid4 rather than a member.
  const other =
    conversation.buyerId === senderId
      ? conversation.sellerId
      : conversation.buyerId;
  if (other) conversation.unread[other] = (conversation.unread[other] ?? 0) + 1;
  conversation.archived = false;
  return item;
}

function itemsOf(conversationId: ID, me: ID): ThreadItem[] {
  return getWorld()
    .threadItems.filter((item) => item.conversationId === conversationId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((item) => ({ ...item, mine: item.senderId === me }));
}

function decorate(conversation: MockConversation, me: ID): Conversation {
  const world = getWorld();
  const listing = world.auctions.find(
    (item) => item.id === conversation.listingId,
  );
  const otherId =
    conversation.buyerId === me ? conversation.sellerId : conversation.buyerId;

  return {
    id: conversation.id,
    kind: conversation.kind,
    listingId: conversation.listingId,
    listingTitle: listing?.title,
    listingImageUrl: listing?.images[0],
    listingPrice: listing?.currentPrice ?? 0,
    otherParty: world.users.find((item) => item.id === otherId),
    orderId: conversation.orderId,
    lastItem: itemsOf(conversation.id, me)[0],
    unreadCount: conversation.unread[me] ?? 0,
    archived: conversation.archived,
    muted: conversation.muted,
    lastItemAt: conversation.lastItemAt,
  };
}

/**
 * The same blunt check the server runs, kept in step with it deliberately: the demo has to behave
 * like the thing it is demonstrating, and the warning banner is the point rather than the regex.
 */
function offPlatform(body: string): FlaggedReason | undefined {
  if (!body) return undefined;
  if (/\bRO ?\d{2}(?: ?[A-Z0-9]){16,20}\b/i.test(body)) return "PAYMENT_DETAILS";
  if (/\b(revolut|paypal|transfer bancar|iban)\b/i.test(body)) {
    return "PAYMENT_DETAILS";
  }
  if (/(?:\+?4?0|\b)(?:[ .\-/]*\d){9}\b/.test(body)) return "PHONE_NUMBER";
  if (/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/.test(body)) return "EMAIL_ADDRESS";
  return undefined;
}

/** The wire shape has no owner on it: the reader is the owner, or they would not have it. */
function stripOwner(row: MockNotification): Notification {
  return {
    id: row.id,
    type: row.type,
    payload: row.payload,
    deepLink: row.deepLink,
    read: row.read,
    createdAt: row.createdAt,
  };
}

function currentMockUser(): ID {
  const id = currentMockUserId();
  // The inbox exists only for somebody. Reading it as nobody is a bug in the
  // caller, not an empty list.
  if (!id) notFound("Conversația");
  return id;
}

/** What the mock world stores, which carries the two sides the wire shape hides. */
export interface MockConversation {
  id: ID;
  kind: "LISTING" | "SUPPORT";
  listingId?: ID;
  buyerId: ID;
  /** Absent on a support thread: the other side is bid4, which is not a member. */
  sellerId?: ID;
  orderId?: ID;
  archived: boolean;
  muted: boolean;
  /** Per participant, because "unread" is not a property of the thread. */
  unread: Record<ID, number>;
  lastItemAt: string;
}

export interface MockNotification extends Notification {
  userId: ID;
}
