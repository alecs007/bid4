"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

import { ApiError } from "@/lib/types";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "A apărut o problemă. Încearcă din nou în câteva momente.";
}

/**
 * Reads through SWR, keyed by a string the caller builds — something like
 * `` `auctions:${JSON.stringify(filters)}` ``.
 *
 * <p>The key is the cache entry, so two components asking the same question share
 * one request and one answer. That is the whole reason this is SWR rather than an
 * effect: the auction page renders the listing, the bid box and the history from
 * overlapping data, and three copies of the same fetch is what a hand-rolled hook
 * gives you for free.
 *
 * The shape it returns is deliberately unchanged — `data`, `error`, `loading`,
 * `reload` — so no call site had to learn a new one.
 */
export function useApi<T>(
  loader: () => Promise<T>,
  key: string,
  options: { enabled?: boolean } = {},
): ApiState<T> & { reload: () => void } {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR<T>(
    // A null key is how SWR is told not to fetch at all.
    enabled ? key : null,
    // Passed straight through, closure and all. It used to be held in a ref that
    // this hook refreshed in an effect, on the theory that a loader rebuilt each
    // render would refetch each render — which is not how SWR decides: the key
    // is. What the ref actually did was lag. SWR refreshes its own copy of the
    // fetcher in a layout effect, before this one ran, so a key change fetched
    // with the previous render's loader and returned the previous filter's
    // results. Changing a filter twice looked like it fixed itself.
    loader,
  );

  const reload = useCallback(() => {
    void mutate();
  }, [mutate]);

  return {
    data: data ?? null,
    error: error ? errorMessage(error) : null,
    // The previous answer stays on screen while the next one loads, so a
    // skeleton belongs behind `loading && !data` rather than `loading`.
    loading: enabled && isLoading,
    reload,
  };
}

/**
 * Drops every cached answer whose key starts with one of these prefixes.
 *
 * <p>Placing a bid changes the listing, the history, the homepage rows and the
 * bidder's own page, and none of those know about each other. Naming the prefixes
 * at the call site keeps that knowledge where the change happens instead of
 * spreading a subscription through the tree.
 */
export function useRevalidate(): (...prefixes: string[]) => void {
  const { mutate } = useSWRConfig();

  return useCallback(
    (...prefixes: string[]) => {
      void mutate(
        (key) => typeof key === "string" && prefixes.some((p) => key.startsWith(p)),
        undefined,
        { revalidate: true },
      );
    },
    [mutate],
  );
}

/** Pair with a toast for the success case — the app-wide convention for actions. */
export function useAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
): {
  run: (...args: TArgs) => Promise<TResult | null>;
  pending: boolean;
  error: string | null;
  reset: () => void;
} {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  });

  const run = useCallback(async (...args: TArgs) => {
    setPending(true);
    setError(null);
    try {
      return await actionRef.current(...args);
    } catch (caught) {
      setError(errorMessage(caught));
      return null;
    } finally {
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => setError(null), []);

  return { run, pending, error, reset };
}
