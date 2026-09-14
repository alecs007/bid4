"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";

import { streamTicket } from "@/lib/api/inbox";
import { bumpInbox } from "@/lib/api/inbox-sync";
import { API_BASE, USE_MOCK } from "@/lib/config";
import { useAuth } from "@/lib/auth/AuthProvider";

const RETRY_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

export function useInboxStream(): void {
  const { user } = useAuth();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    if (USE_MOCK || !user) return;

    let source: EventSource | null = null;
    let timer: number | undefined;
    let attempt = 0;
    let stopped = false;

    const stale = (prefix: string) =>
      mutate(
        (key) => typeof key === "string" && key.startsWith(prefix),
        undefined,
        { revalidate: true },
      );

    const retry = () => {
      if (stopped) return;
      const wait = RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)]!;
      attempt += 1;
      timer = window.setTimeout(connect, wait);
    };

    const connect = async () => {
      if (stopped) return;

      const ticket = await streamTicket().catch(() => null);
      if (stopped) return;
      if (!ticket) {
        retry();
        return;
      }

      const opened = new EventSource(
        `${API_BASE}/inbox/stream?ticket=${encodeURIComponent(ticket)}`,
      );
      source = opened;

      opened.addEventListener("ready", () => {
        attempt = 0;
      });
      const changed = (prefix: string) => {
        void stale(prefix);
        bumpInbox();
      };
      opened.addEventListener("item", () => changed("inbox:"));
      opened.addEventListener("unread", () => changed("inbox:unread"));
      opened.addEventListener("notification", () => changed("inbox:"));

      opened.onerror = () => {
        opened.close();
        if (source === opened) source = null;
        retry();
      };
    };

    void connect();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      source?.close();
    };
  }, [user, mutate]);
}
