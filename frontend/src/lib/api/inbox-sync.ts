"use client";

import { useCallback, useSyncExternalStore } from "react";

import type { UnreadCounts } from "@/lib/types";

export function unreadKey(userId: string | undefined): string {
  return `inbox:unread:${userId}`;
}

export function withThreadRead(current: UnreadCounts | undefined): UnreadCounts {
  return {
    messages: Math.max(0, (current?.messages ?? 0) - 1),
    notifications: current?.notifications ?? 0,
  };
}

export function withNotificationsRead(
  current: UnreadCounts | undefined,
): UnreadCounts {
  return { messages: current?.messages ?? 0, notifications: 0 };
}

let revision = 0;
const listeners = new Set<() => void>();

export function bumpInbox(): void {
  revision += 1;
  for (const listener of listeners) listener();
}

export function useInboxRevision(): number {
  const subscribe = useCallback((onChange: () => void) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  }, []);

  return useSyncExternalStore(
    subscribe,
    () => revision,
    () => 0,
  );
}

const OPEN_THREAD_KEY = "bid4.inbox.open";

export function rememberOpenThread(conversationId: string): void {
  try {
    sessionStorage.setItem(OPEN_THREAD_KEY, conversationId);
  } catch {
  }
}

export function lastOpenThread(): string | null {
  try {
    return sessionStorage.getItem(OPEN_THREAD_KEY);
  } catch {
    return null;
  }
}
