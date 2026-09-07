"use client";

import { useEffect } from "react";
import { useSWRConfig } from "swr";

import { streamTicket } from "@/lib/api/inbox";
import { API_BASE, USE_MOCK } from "@/lib/config";
import { useAuth } from "@/lib/auth/AuthProvider";

/** Backoff between reconnects, in milliseconds. Caps rather than growing forever. */
const RETRY_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

/**
 * Keeps the inbox current without asking.
 *
 * <p>One EventSource for the tab, opened once at the root. The events carry nothing readable — who,
 * which thread, which item — so this only decides which SWR keys are now stale, and the refetch
 * that follows authorises itself properly. Nothing arrives here that the reader was not already
 * entitled to fetch.
 *
 * <p>Opened with a ticket rather than a token, because EventSource sends no Authorization header
 * and the refresh cookie is scoped to /auth: an authenticated POST trades the bearer token for
 * something single-use that lasts thirty seconds. The access token itself never goes in a URL — a
 * query string is written into every log and history entry between here and the server.
 *
 * <p>Which is also why the reconnect is written by hand. EventSource retries on its own, and it
 * retries the URL it was given — a ticket that has already been spent — so its own recovery would
 * be an endless loop of 401s. Every attempt here starts by buying a new one, and the server closes
 * an idle stream after half an hour, so this path is the ordinary case rather than the failure.
 *
 * <p>Silent in mock mode: there is no server to stream from, and the demo's own writes already
 * revalidate through SWR.
 */
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

      // The server's first frame. Reaching it is what proves the ticket was
      // good, so the backoff resets here rather than on open — a connection
      // that opens and is refused is not a success to count from.
      opened.addEventListener("ready", () => {
        attempt = 0;
      });
      opened.addEventListener("item", () => void stale("inbox:"));
      opened.addEventListener("unread", () => void stale("inbox:unread"));
      opened.addEventListener("notification", () => void stale("inbox:"));

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
    // The stream belongs to the session, not to a render.
  }, [user, mutate]);
}
