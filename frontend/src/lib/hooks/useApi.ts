"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import useSWRInfinite from "swr/infinite";

import { ApiError } from "@/lib/types";
import type { Page } from "@/lib/types";

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

export interface PagedState<T> {
  items: T[];
  /** How many there are in total, known from the first page and not from what has arrived. */
  total: number | null;
  error: string | null;
  /** The first page is still in flight, so there is nothing to show yet. */
  loading: boolean;
  /** A further page is in flight, under results that are already on screen. */
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

/**
 * The same read as {@link useApi}, one page at a time.
 *
 * <p>For lists long enough that asking for all of them is the wrong request: the caller renders
 * what has arrived and calls `loadMore` when the reader nears the end. `total` comes off the first
 * page, so a count can be shown in full while only a fraction has been fetched.
 *
 * <p>`loadMore` is deliberately inert while a page is already in flight or the last one has
 * landed. An intersection observer fires far more often than a list needs to grow — every scroll
 * that keeps the sentinel in view is another call — and without this guard each of them would be
 * a request.
 */
export function useApiPages<T>(
  loader: (page: number) => Promise<Page<T>>,
  key: string,
  options: { enabled?: boolean } = {},
): PagedState<T> {
  const { enabled = true } = options;

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<Page<T>>(
      (index, previous) => {
        if (!enabled) return null;
        // Stop asking once the server has said this is the last page, rather
        // than fetching an empty one to find out.
        if (previous && previous.page >= previous.totalPages) return null;
        return `${key}#${index + 1}`;
      },
      (pageKey: string) => loader(Number(pageKey.slice(pageKey.lastIndexOf("#") + 1))),
      // The first page is not re-fetched every time a later one is asked for.
      // Without this, growing a list of five pages costs six requests.
      { revalidateFirstPage: false },
    );

  const pages = data ?? [];
  const last = pages.at(-1) ?? null;
  const loadingMore = size > pages.length;
  const hasMore = last ? last.page < last.totalPages : false;

  const loadMore = useCallback(() => {
    if (loadingMore || isValidating || !hasMore) return;
    void setSize((current) => current + 1);
  }, [loadingMore, isValidating, hasMore, setSize]);

  const reload = useCallback(() => {
    void mutate();
  }, [mutate]);

  return {
    items: pages.flatMap((page) => page.items),
    total: pages[0]?.total ?? null,
    error: error ? errorMessage(error) : null,
    loading: enabled && isLoading,
    loadingMore,
    hasMore,
    loadMore,
    reload,
  };
}

/**
 * A list the API only answers in full, revealed a step at a time.
 *
 * <p>`/causes` and `/users` take no page parameter, so there is nothing to ask for a second time.
 * Windowing what arrived saves no request; it saves fifty cards and fifty photographs being built
 * for somebody who will look at six, and it lets those lists behave like the paged ones.
 *
 * <p>The count resets when `resetKey` does — the term, the profile, whatever makes it a different
 * list. Adjusted during render against a remembered key rather than in an effect, which is what
 * React asks for when state has to follow something outside it.
 */
export function useWindowedList<T>(
  all: T[] | null,
  resetKey: string,
  step: number,
): { items: T[] | null; hasMore: boolean; loadMore: () => void } {
  const [shown, setShown] = useState(step);
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setShown(step);
  }

  const loadMore = useCallback(
    () => setShown((current) => current + step),
    [step],
  );

  return {
    items: all ? all.slice(0, shown) : null,
    hasMore: (all?.length ?? 0) > shown,
    loadMore,
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
