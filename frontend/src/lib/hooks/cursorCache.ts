"use client";

export interface CachedPages<T> {
  items: T[];
  cursor: string | undefined;
  exhausted: boolean;
  at: number;
}

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

export function clearPages(): void {
  cache.clear();
}
