"use client";

import { useEffect, useRef } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

type Slot = number | "gap-start" | "gap-end";

function buildSlots(page: number, totalPages: number): Slot[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const slots: Slot[] = [1];
  if (page > 3) slots.push("gap-start");

  const from = Math.max(2, page - 1);
  const to = Math.min(totalPages - 1, page + 1);
  for (let value = from; value <= to; value += 1) slots.push(value);

  if (page < totalPages - 2) slots.push("gap-end");
  slots.push(totalPages);
  return slots;
}

const CELL =
  "inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-xl px-2 text-sm font-bold transition";

export function Pagination({
  page,
  totalPages,
  onChange,
  className,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const slots = buildSlots(page, totalPages);
  const trimOnMobile = totalPages > 5;
  const go = (next: number) => onChange(Math.min(Math.max(next, 1), totalPages));

  return (
    <nav
      aria-label="Paginare"
      className={cn("flex items-center justify-center gap-1.5", className)}
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page <= 1}
        aria-label="Pagina anterioară"
        className={cn(
          CELL,
          "bg-white ring-1 ring-edge",
          page <= 1
            ? "cursor-not-allowed text-ink-300"
            : "text-ink-700 hover:text-ink-900 hover:ring-ink-300",
        )}
      >
        <Icons.forward aria-hidden="true" className="h-4 w-4 rotate-180" />
      </button>

      {slots.map((slot) => {
        if (typeof slot !== "number") {
          return (
            <span
              key={slot}
              aria-hidden="true"
              className="inline-flex h-10 w-6 shrink-0 items-center justify-center text-sm text-ink-400"
            >
              …
            </span>
          );
        }

        const isCurrent = slot === page;
        const isNeighbour =
          trimOnMobile && !isCurrent && slot !== 1 && slot !== totalPages;

        return (
          <button
            key={slot}
            type="button"
            onClick={() => go(slot)}
            aria-current={isCurrent ? "page" : undefined}
            aria-label={`Pagina ${slot}`}
            className={cn(
              CELL,
              "numeric",
              isCurrent
                ? "bg-primary-600 text-white"
                : "bg-white text-ink-700 ring-1 ring-edge hover:text-ink-900 hover:ring-ink-300",
              isNeighbour && "hidden sm:inline-flex",
            )}
          >
            {slot}
          </button>
        );
      })}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page >= totalPages}
        aria-label="Pagina următoare"
        className={cn(
          CELL,
          "bg-white ring-1 ring-edge",
          page >= totalPages
            ? "cursor-not-allowed text-ink-300"
            : "text-ink-700 hover:text-ink-900 hover:ring-ink-300",
        )}
      >
        <Icons.forward aria-hidden="true" className="h-4 w-4 shrink-0" />
      </button>
    </nav>
  );
}

/**
 * How much of the page below the fold counts as "nearly there".
 *
 * <p>Generous on purpose. A card in these grids is around 500px tall, so this is two rows of
 * warning: by the time the last loaded row reaches the screen the next page is usually already in,
 * and the list grows without ever showing its own bottom. Small margins are what make an infinite
 * list feel like it stops and starts.
 */
const LEAD_PX = 1200;

/**
 * The bottom of a list that has more to give.
 *
 * <p>Everything scroll-loaded on the site goes through this, so the lists all wait the same
 * distance from the end and stop the same way.
 *
 * <p>The observer is disconnected while a page is in flight and once there is nothing left to ask
 * for. One left watching re-fires on every scroll that keeps it in view, and each of those would
 * be a request; this way there is at most one outstanding, ever.
 */
export function LoadMore({
  hasMore,
  loading = false,
  onReach,
  waiting,
  className,
}: {
  hasMore: boolean;
  /** A page is already on its way. */
  loading?: boolean;
  onReach: () => void;
  /** Drawn in place of the results that are coming, so the list does not jump when they land. */
  waiting?: React.ReactNode;
  className?: string;
}) {
  if (!hasMore && !loading) return null;

  return (
    <div className={cn("mt-3 sm:mt-4", className)}>
      {loading ? waiting : null}
      <Sentinel active={hasMore && !loading} onReach={onReach} />
    </div>
  );
}

function Sentinel({
  active,
  onReach,
}: {
  active: boolean;
  onReach: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onReach();
      },
      { rootMargin: `${LEAD_PX}px 0px` },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, onReach]);

  return <div ref={ref} aria-hidden="true" className="h-px w-full" />;
}
