"use client";

/**
 * What a cursor-paged list remembers between visits.
 *
 * <p>SWR keeps every ordinary read for the life of the tab, so opening a listing twice costs one
 * request. The cursor lists had no such thing: they held their rows in component state, so leaving
 * the inbox threw away everything that had been scrolled in and coming back re-read page one and
 * drew a skeleton over it — for rows that had not changed since the reader looked at them a second
 * earlier.
 *
 * <p>So the same bargain SWR makes, made here: the rows come back instantly from what was already
 * fetched, and a request only follows if they are old enough to be worth doubting. Fresh enough,
 * and there is no request at all.
 *
 * <p>In memory, deliberately. This is a cache of somebody's private correspondence and it belongs
 * to the tab that fetched it, not to the machine — a reload is a good moment to ask the server
 * again, and a shared computer is a good reason not to leave any of it on disk.
 */

export interface CachedPages<T> {
  items: T[];
  /** Where the next page starts. Undefined once there is no next page. */
  cursor: string | undefined;
  exhausted: boolean;
  /** When the newest page in here landed. */
  at: number;
}

/**
 * How long rows are taken on trust.
 *
 * <p>Long enough to cover moving between the two halves of the inbox and back, which is the
 * journey that was costing a refetch each way. Past it the rows are still shown — they are only
 * re-read behind them, so nothing blinks.
 */
export const FRESH_MS = 30_000;

const cache = new Map<string, CachedPages<unknown>>();

export function readPages<T>(key: string): CachedPages<T> | undefined {
  return cache.get(key) as CachedPages<T> | undefined;
}

export function writePages<T>(key: string, value: CachedPages<T>): void {
  cache.set(key, value as CachedPages<unknown>);
}

export function isFresh(entry: CachedPages<unknown> | undefined): boolean {
  return entry !== undefined && Date.now() - entry.at < FRESH_MS;
}

/**
 * Empties it.
 *
 * <p>Called when somebody signs out. Cache keys carry the viewer's id, so the next account could
 * not read these anyway — but the rows are still sitting in memory on a machine their owner has
 * just walked away from, and nothing needs them again.
 */
export function clearPages(): void {
  cache.clear();
}
