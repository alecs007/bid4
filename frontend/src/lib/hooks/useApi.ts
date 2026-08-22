"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

  // `key` is stored alongside the result so `loading` can be derived rather
  // than announced from inside the effect. Announcing it a frame late let the
  // caller render "loaded, empty" for one frame every time the key changed —
  // long enough for an empty state to flash in place of a skeleton.
  const [state, setState] = useState<{
    data: T | null;
    error: string | null;
    key: string | null;
  }>({ data: null, error: null, key: null });
  const [pending, setPending] = useState(false);
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
      setPending(true);
      try {
        const data = await loaderRef.current();
        // Inside a transition, so the <ViewTransition> around the page can
        // crossfade the skeleton into the content instead of swapping it in
        // one frame. Plain setState would not qualify.
        if (!cancelled) startTransition(() => setState({ data, error: null, key }));
      } catch (error) {
        if (!cancelled) {
          startTransition(() =>
            setState({ data: null, error: errorMessage(error), key }),
          );
        }
      } finally {
        if (!cancelled) setPending(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [key, nonce, enabled]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return {
    // Whatever was loaded last stays on screen while the next request runs;
    // callers guard with `loading && !data` when they want a skeleton instead.
    data: state.data,
    // An error from a previous key is not this key's error.
    error: state.key === key ? state.error : null,
    loading: enabled && (state.key !== key || pending),
    reload,
  };
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
