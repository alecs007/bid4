"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { UnreadCounts } from "@/lib/types";

/**
 * Keeping every count of unread things on screen telling the same story.
 *
 * <p>There are three of them — the marks in the site bar, the strip above the inbox on a phone, and
 * the badge on each row of the list — and until this existed they did not agree. The first two read
 * through SWR, so one `mutate` reached both; the list does not, because it is cursor-paged and SWR
 * has no notion of a list somebody keeps scrolling. So reading a thread cleared the bar and left the
 * row it was on still claiming three unread, until something unrelated happened to refetch.
 *
 * <p>Two parts, because the problem has two halves. The key is shared so the SWR readers cannot
 * drift apart on a typo, and the revision is a signal anything can listen to, for the readers SWR
 * cannot reach.
 */

/** The one cache entry the counts live in. Everything that reads or writes them names it from here. */
export function unreadKey(userId: string | undefined): string {
  return `inbox:unread:${userId}`;
}

/**
 * What the counts become the moment a thread is opened, before the server has confirmed it.
 *
 * <p>`messages` counts threads with something waiting rather than messages waiting, so reading one
 * takes exactly one off it however many lines it held. Guarded at zero: this is a guess made while a
 * request is in the air, and a negative badge is a worse lie than a stale one.
 */
export function withThreadRead(current: UnreadCounts | undefined): UnreadCounts {
  return {
    messages: Math.max(0, (current?.messages ?? 0) - 1),
    notifications: current?.notifications ?? 0,
  };
}

/** And what they become when the notifications tab is opened, which reads all of them at once. */
export function withNotificationsRead(
  current: UnreadCounts | undefined,
): UnreadCounts {
  return { messages: current?.messages ?? 0, notifications: 0 };
}

let revision = 0;
const listeners = new Set<() => void>();

/**
 * Says that something about the inbox has changed.
 *
 * <p>Called beside the SWR invalidation rather than instead of it: the two cover different readers.
 * Cheap enough to call on every message that arrives — it moves a number and wakes whoever asked.
 */
export function bumpInbox(): void {
  revision += 1;
  for (const listener of listeners) listener();
}

/** A value that changes whenever the inbox does. Put it where a refetch should follow. */
export function useInboxRevision(): number {
  const subscribe = useCallback((onChange: () => void) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }, []);

  // Nought on the server: nothing has changed anywhere that has not rendered yet.
  return useSyncExternalStore(
    subscribe,
    () => revision,
    () => 0,
  );
}

/**
 * Which conversation was open when the reader last left the inbox.
 *
 * <p>Coming back to `/cont/inbox` on a desktop opens a thread rather than a prompt, and the useful
 * one to open is the one they were reading — not the top of the list, which sends somebody who was
 * mid-negotiation back to bid4's greeting every time they glance at another page.
 *
 * <p>Session storage, so it belongs to the tab and is gone when it closes: it is a pointer into
 * somebody's correspondence, and it should not outlive the sitting on a shared machine. Only ever
 * used to choose between threads the list already came back with, so a stale or tampered value
 * selects nothing rather than reaching for a conversation the reader is not in.
 */
const OPEN_THREAD_KEY = "bid4.inbox.open";

export function rememberOpenThread(conversationId: string): void {
  try {
    sessionStorage.setItem(OPEN_THREAD_KEY, conversationId);
  } catch {
    // Private browsing refuses the write. The list's first row is the fallback.
  }
}

export function lastOpenThread(): string | null {
  try {
    return sessionStorage.getItem(OPEN_THREAD_KEY);
  } catch {
    return null;
  }
}
