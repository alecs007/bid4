"use client";

import { SWRConfig } from "swr";

import { ApiError } from "@/lib/types";

/**
 * How every read in the app behaves by default.
 *
 * <p>An auction is a live document — the price moves while you are looking at it —
 * so revalidating when a tab regains focus is the difference between a countdown
 * and a screenshot. Everything else here is about not making that expensive.
 */
export function SwrProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // The same question asked by three components within this window is one
        // request. The auction page alone renders the listing, the bid box and
        // the fee breakdown from overlapping reads.
        dedupingInterval: 3_000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        // No polling: the countdown is local, and a page that refetches on a
        // timer costs every visitor bandwidth to show them what they can already
        // see. Live prices belong on the WebSocket channel when it exists.
        refreshInterval: 0,
        keepPreviousData: true,
        errorRetryCount: 2,

        shouldRetryOnError: (error: unknown) => {
          // Retrying a refusal just repeats it. A 404 is an answer, a 403 is a
          // decision, and a 400 is our own mistake — only the ones that might
          // have been the network are worth asking again.
          if (error instanceof ApiError) {
            return error.status >= 500 || error.status === 429;
          }
          return true;
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
