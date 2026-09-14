"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CursorPage } from "@/lib/types";
import { isFresh, readPages, writePages } from "./cursorCache";

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
  setHasMore: (value: boolean) => void;
}

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
    if (page.active.current !== forKey) return;

    page.cursor.current = answer.nextCursor;
    page.exhausted.current = !answer.nextCursor;
    page.setHasMore(Boolean(answer.nextCursor));
    page.setItems((current) => {
      const rows = first ? answer.items : [...(current ?? []), ...answer.items];
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
    page.exhausted.current = true;
    page.setHasMore(false);
  } finally {
    page.inFlight.current = false;
    page.setLoadingMore(false);
  }
}

export function useCursorList<T>({
  load,
  key,
  revision = 0,
}: {
  load: (cursor?: string) => Promise<CursorPage<T>>;
  key: string;
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

    const cached = readPages<T>(key);
    if (cached) {
      cursor.current = cached.cursor;
      exhausted.current = cached.exhausted;
      if (isFresh(cached)) return;
    }

    void loadPage(paging(), true, key);
  }, [key, paging]);

  const firstRevision = useRef(revision);
  useEffect(() => {
    if (revision === firstRevision.current) return;
    firstRevision.current = revision;
    void loadPage(paging(), true, active.current);
  }, [revision, paging]);

  const loadMore = useCallback(() => {
    void loadPage(paging(), false, active.current);
  }, [paging]);

  const loaded = loadedKey === key;
  const cached = loaded ? undefined : readPages<T>(key);

  return {
    items: loaded ? items : (cached?.items ?? null),
    error,
    loading: !loaded && !cached,
    loadingMore,
    hasMore: loaded ? hasMore : !cached?.exhausted,
    loadMore,
  };
}
