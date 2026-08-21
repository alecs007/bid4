"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/types";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return "A apărut o problemă. Mai încearcă o dată.";
}

/**
 * Loads data from `lib/api/*` inside a client component.
 *
 * Deliberately keyed by a string rather than a dependency array: callers pass
 * something like `` `auctions:${JSON.stringify(filters)}` ``, which keeps the
 * effect honest without fighting exhaustive-deps over an inline closure.
 *
 * `loading` stays true until the first result arrives, which is what every
 * skeleton on the site keys off.
 */
export function useApi<T>(
  loader: () => Promise<T>,
  key: string,
  options: { enabled?: boolean } = {},
): ApiState<T> & { reload: () => void } {
  const { enabled = true } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    loading: enabled,
  });
  const [nonce, setNonce] = useState(0);

  // The loader is recreated on every render; keep it out of the deps.
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const run = async () => {
      setState((previous) => ({ ...previous, loading: true, error: null }));
      try {
        const data = await loaderRef.current();
        if (!cancelled) setState({ data, error: null, loading: false });
      } catch (error) {
        if (!cancelled) {
          setState({ data: null, error: errorMessage(error), loading: false });
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [key, nonce, enabled]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return { ...state, reload };
}

/**
 * Runs a mutation and tracks its pending/error state. Pair with a toast for
 * the success case — that is the app-wide convention for user actions.
 */
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
