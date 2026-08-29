"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PAGINATION } from "@/lib/config";

/**
 * Filtering and paging for an account list, so both pages behave identically.
 *
 * <p>Three things it settles that were otherwise going to be settled twice, and
 * differently:
 *
 * <p>Which filters are worth offering. A tab that would show nothing is a tab
 * nobody wants to press, and a row of them for an account with four listings is
 * chrome pretending to be a control. Only buckets holding something are offered,
 * and if there is one bucket or none the whole row goes — a filter with a single
 * option is just a label.
 *
 * <p>Where the reader ends up. Changing a filter returns to page one, because
 * page four of a filter that has two pages is nowhere. The page number is
 * clamped rather than reset when the list shrinks under it, so withdrawing the
 * last row on the last page steps back a page instead of throwing the reader to
 * the top.
 *
 * <p>What happens if the current filter empties out — withdraw the last active
 * listing and "Active" stops existing. The selection falls back rather than
 * leaving the page insisting on a bucket that is gone.
 */
export interface ListView<T, F extends string> {
  /** The rows for the current filter and page. */
  shown: T[];
  /** Every row matching the filter, across pages. */
  matching: T[];
  filter: F;
  choose: (next: F) => void;
  page: number;
  totalPages: number;
  goToPage: (next: number) => void;
  /** Filters worth showing, or an empty array when a filter row would be noise. */
  options: { value: F; label: string }[];
  /** True when rows exist but the filter is hiding them all. */
  hiddenByFilter: boolean;
  /** Briefly true after a filter or page change, while the list swaps over. */
  settling: boolean;
  /** How many placeholders to draw so the swap does not resize the page. */
  outgoing: number;
}

export function useListView<T, F extends string>({
  rows,
  filters,
  bucketOf,
  all,
}: {
  rows: T[] | null;
  /** Every filter in display order, including the catch-all. */
  filters: { value: F; label: string }[];
  /** Which bucket a row belongs to. Never the catch-all. */
  bucketOf: (row: T) => F;
  /** The catch-all value, always offered when a filter row is shown at all. */
  all: F;
}): ListView<T, F> {
  const [filter, setFilter] = useState<F>(all);
  const [page, setPage] = useState(1);
  const [settling, setSettling] = useState(false);
  const [outgoing, setOutgoing] = useState(0);
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
    // One bucket means every row is in it, so the control would have nothing to
    // choose between. None means there is nothing to filter at all.
    if (populated.length <= 1) return [];
    return [
      { ...filters.find((option) => option.value === all)!, label: labelWith(filters, all, items.length) },
      ...populated.map((option) => ({
        ...option,
        label: `${option.label} (${counts.get(option.value) ?? 0})`,
      })),
    ];
  }, [counts, items.length, filters, all]);

  // The selection has to be legal for what is on screen: a bucket can empty out
  // under it, and then the page would be filtering by something nobody can pick.
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


  /** How many rows a bucket holds, without having to switch to it first. */
  const sizeOf = useCallback(
    (bucket: F) =>
      bucket === all ? items.length : items.filter((row) => bucketOf(row) === bucket).length,
    [items, bucketOf, all],
  );

  /** How many of those land on a given page. */
  const onPage = (total: number, page: number) =>
    Math.max(0, Math.min(PAGINATION.DEFAULT_PAGE_SIZE, total - (page - 1) * PAGINATION.DEFAULT_PAGE_SIZE));

  // Rows already in hand, so a filter costs nothing to apply and the list would
  // otherwise swap under the cursor between one frame and the next. A brief
  // placeholder is the same beat the catalogue has, where the pause is a real
  // request; here it is only long enough to read as a change rather than a jump.
  //
  // Drawn at the *incoming* count, not the outgoing one. Standing in for what is
  // leaving means a jump to twelve placeholders and then a collapse to the one
  // row that arrives — the shift lands at the end, after the reader has stopped
  // expecting movement. Standing in for what is coming puts the whole change at
  // the click, where it was asked for, and the placeholder is then the height of
  // its own replacement.
  const settle = useCallback((count: number) => {
    setOutgoing(count);
    setSettling(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setSettling(false), 180);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const choose = useCallback(
    (next: F) => {
      settle(onPage(sizeOf(next), 1));
      setFilter(next);
      setPage(1);
    },
    [settle, sizeOf],
  );

  const goToPage = useCallback(
    (next: number) => {
      settle(onPage(matching.length, next));
      setPage(next);
    },
    [settle, matching.length],
  );

  return {
    shown,
    matching,
    filter: active,
    choose,
    page: current,
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
