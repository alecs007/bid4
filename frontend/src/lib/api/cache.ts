/**
 * Imports nothing, so the API layer that fills it and the mock store that
 * invalidates it can both depend on it without forming an import cycle.
 */

interface Entry<T> {
  at: number;
  value: T;
}

const entries = new Map<string, Entry<unknown>>();

export function readCache<T>(key: string, ttlMs: number): T | null {
  const entry = entries.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > ttlMs) {
    entries.delete(key);
    return null;
  }
  return entry.value as T;
}

export function writeCache<T>(key: string, value: T): void {
  entries.set(key, { at: Date.now(), value });
}

export function invalidateCache(key: string): void {
  entries.delete(key);
}

/** Keys are declared here so a typo cannot silently create a second cache. */
export const CACHE_KEYS = {
  platformStats: "stats:platform",
} as const;
