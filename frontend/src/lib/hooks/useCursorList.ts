"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CursorPage } from "@/lib/types";
import { isFresh, readPages, writePages } from "./cursorCache";

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
  /**
   * The ref's twin, for rendering.
   *
   * <p>`exhausted` is a ref because the guard above has to see it the instant it is set, before any
   * render. A render cannot read a ref and be told when it changes, so the same fact is kept twice:
   * the ref decides whether to fetch, this decides whether to draw the bottom of the list. Only set
   * after an await, so starting a page from an effect never cascades a render.
   */
  setHasMore: (value: boolean) => void;
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
    page.setHasMore(Boolean(answer.nextCursor));
    page.setItems((current) => {
      const rows = first ? answer.items : [...(current ?? []), ...answer.items];
      // Kept for the next visit, pages and all, so coming back to this list is
      // free and scrolling it again does not start from the top.
      writePages(forKey, {
        items: rows,
        cursor: answer.nextCursor,
        exhausted: !answer.nextCursor,
        at: Date.now(),
      });
      return rows;
    });
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
    page.setHasMore(false);
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
 * <p>Watching for the end is `<LoadMore>`'s job, the same component the catalogue and the search
 * results use — so every scrolling list on the site waits the same distance from its bottom, stops
 * the same way, and draws the same placeholder for the rows on their way in. A scroll handler here
 * would have had to know which element scrolls, the page on a phone and a pinned column on a
 * desktop, and would have been wrong the first time that changed.
 *
 * <p>One page in flight at a time, and the guard is a ref rather than state: the observer can fire
 * twice before React has re-rendered, and two identical requests would append the same rows twice.
 */
export function useCursorList<T>({
  load,
  key,
  revision = 0,
}: {
  load: (cursor?: string) => Promise<CursorPage<T>>;
  /** Changing this starts the list again — a different account, a different tab. */
  key: string;
  /**
   * Changing this re-reads the list where it stands.
   *
   * <p>Not folded into `key`, which is the stronger statement: a new key means a different list, so
   * the rows on screen belong to nobody and are dropped for a skeleton. A new revision means the
   * same list said something new — a thread was read, a message arrived — and the rows stay up
   * until the new ones land, because a list that blinks every time a number changes is worse than
   * one that is a moment out of date.
   */
  revision?: number;
}) {
  const [items, setItems] = useState<T[] | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const cursor = useRef<string | undefined>(undefined);
  const exhausted = useRef(false);
  const inFlight = useRef(false);
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
      setHasMore,
    }),
    [],
  );

  useEffect(() => {
    active.current = key;
    inFlight.current = false;

    // Picked up where it was left. The rows are already on screen by now — the
    // render below reads them straight out of the cache — so this only decides
    // whether to ask the server again, and the refs have to be told where the
    // paging had got to either way.
    const cached = readPages<T>(key);
    if (cached) {
      cursor.current = cached.cursor;
      exhausted.current = cached.exhausted;
      if (isFresh(cached)) return;
    }

    void loadPage(paging(), true, key);
  }, [key, paging]);

  // A re-read of the first page in place. Pages scrolled in past it are given
  // up, which is the right trade for an inbox: what changes is at the top, and
  // holding twenty rows of history to avoid re-reading ten is the wrong saving.
  const firstRevision = useRef(revision);
  useEffect(() => {
    if (revision === firstRevision.current) return;
    firstRevision.current = revision;
    void loadPage(paging(), true, active.current);
  }, [revision, paging]);

  const loadMore = useCallback(() => {
    void loadPage(paging(), false, active.current);
  }, [paging]);

  // What this render shows. Rows loaded in this mount win; otherwise whatever
  // the last visit left behind for this exact key. Stale rows belong to a list
  // nobody asked for, so a key with neither shows nothing rather than somebody
  // else's — which is what the skeleton is for.
  const loaded = loadedKey === key;
  const cached = loaded ? undefined : readPages<T>(key);

  return {
    items: loaded ? items : (cached?.items ?? null),
    error,
    loading: !loaded && !cached,
    loadingMore,
    /** Whether there is another page to ask for. */
    hasMore: loaded ? hasMore : !cached?.exhausted,
    /** Hand this to `<LoadMore>`, the same bottom every scrolling list on the site uses. */
    loadMore,
  };
}
