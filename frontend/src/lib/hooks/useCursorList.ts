"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CursorPage } from "@/lib/types";

/**
 * The handles one page-load needs.
 *
 * <p>Passed in rather than closed over, so the routine below can live outside the component. That is
 * also what keeps the effect that starts it honest: React's rule about setting state synchronously
 * in an effect follows a callback defined inside the hook, and this genuinely is not that.
 */
interface Paging<T> {
  loader: { current: (cursor?: string) => Promise<CursorPage<T>> };
  active: { current: string };
  cursor: { current: string | undefined };
  exhausted: { current: boolean };
  inFlight: { current: boolean };
  setItems: (update: (current: T[] | null) => T[]) => void;
  setLoadedKey: (key: string) => void;
  setError: (message: string | null) => void;
  setLoadingMore: (busy: boolean) => void;
}

/**
 * Fetches one page: the first replaces the list, the rest append.
 *
 * <p>Nothing before the first `await` touches state, so starting it from an effect cannot cascade a
 * second render before the browser has drawn the first.
 */
async function loadPage<T>(page: Paging<T>, first: boolean, forKey: string) {
  if (page.inFlight.current || (!first && page.exhausted.current)) return;
  page.inFlight.current = true;
  if (first) {
    page.cursor.current = undefined;
    page.exhausted.current = false;
  } else {
    page.setLoadingMore(true);
  }

  try {
    const answer = await page.loader.current(
      first ? undefined : page.cursor.current,
    );
    // The list changed while this was in the air. Its answer is about a list
    // nobody is looking at any more.
    if (page.active.current !== forKey) return;

    page.cursor.current = answer.nextCursor;
    page.exhausted.current = !answer.nextCursor;
    page.setItems((current) =>
      first ? answer.items : [...(current ?? []), ...answer.items],
    );
    page.setLoadedKey(forKey);
    page.setError(null);
  } catch (failure) {
    if (page.active.current !== forKey) return;
    page.setError(
      failure instanceof Error ? failure.message : "Nu am putut încărca lista.",
    );
    if (first) {
      page.setItems(() => []);
      page.setLoadedKey(forKey);
    }
    // Stop rather than spin: an observer that keeps firing against a failing
    // endpoint is a request every time the list moves a pixel.
    page.exhausted.current = true;
  } finally {
    page.inFlight.current = false;
    page.setLoadingMore(false);
  }
}

/**
 * A list that grows as somebody scrolls to the end of it.
 *
 * <p>Keyset paging all the way down: the loader is handed the last cursor and answers with the next
 * page and the one after it. Nothing here counts pages or knows how many there are, because neither
 * is knowable on a list that is appended to while it is being read.
 *
 * <p>The sentinel is watched rather than the scroll position. A scroll handler would have to know
 * which element scrolls — the page on a phone, a pinned column on a desktop — and would be wrong the
 * first time that changed; an element that says when it comes into view does not care.
 *
 * <p>One page in flight at a time, and the guard is a ref rather than state: the observer can fire
 * twice before React has re-rendered, and two identical requests would append the same rows twice.
 */
export function useCursorList<T>({
  load,
  key,
}: {
  load: (cursor?: string) => Promise<CursorPage<T>>;
  /** Changing this starts the list again — a different account, a different tab. */
  key: string;
}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const cursor = useRef<string | undefined>(undefined);
  const exhausted = useRef(false);
  const inFlight = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const active = useRef(key);
  const loader = useRef(load);

  // Kept current in an effect rather than assigned during render, which React
  // forbids. Declared first, so it is already the right loader when the effect
  // below runs.
  useEffect(() => {
    loader.current = load;
  });

  const paging = useCallback(
    (): Paging<T> => ({
      loader,
      active,
      cursor,
      exhausted,
      inFlight,
      setItems,
      setLoadedKey,
      setError,
      setLoadingMore,
    }),
    [],
  );

  useEffect(() => {
    active.current = key;
    inFlight.current = false;
    void loadPage(paging(), true, key);
  }, [key, paging]);

  useEffect(() => {
    const mark = sentinel.current;
    if (!mark) return;

    // A margin, so the next page is already arriving by the time the last row
    // is reached rather than starting when it is.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadPage(paging(), false, active.current);
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(mark);
    return () => observer.disconnect();
  }, [paging, items]);

  return {
    // Stale rows belong to a list nobody asked for. Until the first page of
    // this one lands there is nothing to show, rather than somebody else's.
    items: loadedKey === key ? items : null,
    error,
    loading: loadedKey !== key,
    loadingMore,
    /** Put this after the last row. */
    sentinel,
  };
}
