"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { scrollPageTo } from "@/components/layout/SmoothScroll";
import { PAGINATION } from "@/lib/config";

export interface ListView<T, F extends string> {
  shown: T[];
  matching: T[];
  filter: F;
  choose: (next: F) => void;
  page: number;
  totalPages: number;
  goToPage: (next: number) => void;
  options: { value: F; label: string }[];
  hiddenByFilter: boolean;
  settling: boolean;
  outgoing: number;
}

export function useListView<T, F extends string>({
  rows,
  filters,
  bucketOf,
  all,
}: {
  rows: T[] | null;
  filters: { value: F; label: string }[];
  bucketOf: (row: T) => F;
  all: F;
}): ListView<T, F> {
  const [filter, setFilter] = useState<F>(all);
  const [page, setPage] = useState(1);
  const [settling, setSettling] = useState(false);
  const [outgoing, setOutgoing] = useState(0);

  const [pendingPage, setPendingPage] = useState<number | null>(null);
  const [pendingFilter, setPendingFilter] = useState<F | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const items = useMemo(() => rows ?? [], [rows]);

  const counts = useMemo(() => {
    const tally = new Map<F, number>();
    for (const row of items) {
      const bucket = bucketOf(row);
      tally.set(bucket, (tally.get(bucket) ?? 0) + 1);
    }
    return tally;
  }, [items, bucketOf]);

  const options = useMemo(() => {
    const populated = filters.filter(
      (option) => option.value !== all && (counts.get(option.value) ?? 0) > 0,
    );
    if (populated.length <= 1) return [];
    return [
      { ...filters.find((option) => option.value === all)!, label: labelWith(filters, all, items.length) },
      ...populated.map((option) => ({
        ...option,
        label: `${option.label} (${counts.get(option.value) ?? 0})`,
      })),
    ];
  }, [counts, items.length, filters, all]);

  const active: F =
    filter === all || options.some((option) => option.value === filter) ? filter : all;

  const matching = useMemo(
    () => (active === all ? items : items.filter((row) => bucketOf(row) === active)),
    [items, active, all, bucketOf],
  );

  const totalPages = Math.max(1, Math.ceil(matching.length / PAGINATION.DEFAULT_PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = matching.slice(
    (current - 1) * PAGINATION.DEFAULT_PAGE_SIZE,
    current * PAGINATION.DEFAULT_PAGE_SIZE,
  );

  const settle = useCallback((leaving: number, apply: () => void) => {
    setOutgoing(leaving);
    setSettling(true);

    scrollPageTo(0, {
      onComplete: () => {
        apply();
        setPendingPage(null);
        setPendingFilter(null);
        if (timer.current !== null) window.clearTimeout(timer.current);
        timer.current = window.setTimeout(
          () => setSettling(false),
          PAGINATION.REVEAL_HOLD_MS,
        );
      },
    });
  }, []);

  const choose = useCallback(
    (next: F) => {
      setPendingFilter(next);
      setPendingPage(1);
      settle(shown.length, () => {
        setFilter(next);
        setPage(1);
      });
    },
    [settle, shown.length],
  );

  const goToPage = useCallback(
    (next: number) => {
      setPendingPage(next);
      settle(shown.length, () => setPage(next));
    },
    [settle, shown.length],
  );

  return {
    shown,
    matching,
    filter: pendingFilter ?? active,
    choose,
    page: pendingPage ?? current,
    totalPages,
    goToPage,
    options,
    hiddenByFilter: items.length > 0 && matching.length === 0,
    settling,
    outgoing: outgoing || shown.length,
  };
}

function labelWith<F extends string>(
  filters: { value: F; label: string }[],
  value: F,
  count: number,
): string {
  const base = filters.find((option) => option.value === value)?.label ?? "";
  return `${base} (${count})`;
}
