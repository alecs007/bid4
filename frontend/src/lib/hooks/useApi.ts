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

export function useApi<T>(
  loader: () => Promise<T>,
  key: string,
  options: { enabled?: boolean } = {},
): ApiState<T> & { reload: () => void } {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR<T>(
    enabled ? key : null,
    loader,
  );

  const reload = useCallback(() => {
    void mutate();
  }, [mutate]);

  return {
    data: enabled ? (data ?? null) : null,
    error: enabled && error ? errorMessage(error) : null,
    loading: enabled && isLoading,
    reload,
  };
}

export interface PagedState<T> {
  items: T[];
  total: number | null;
  error: string | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  reload: () => void;
}

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
        if (previous && previous.page >= previous.totalPages) return null;
        return `${key}#${index + 1}`;
      },
      (pageKey: string) => loader(Number(pageKey.slice(pageKey.lastIndexOf("#") + 1))),
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
