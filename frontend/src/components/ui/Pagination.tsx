"use client";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

/**
 * Pagination that always fits one row, phone included.
 *
 * The first and last page are always reachable, the current page always has
 * its neighbours, and the gaps collapse into an ellipsis. On small screens the
 * neighbours are hidden rather than wrapped, which keeps the control to seven
 * slots at most: ← 1 … 5 … 12 →
 */

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
  // Short ranges fit on a phone as they are; only long ones need trimming.
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
        // Neighbours are the first thing to go when the row gets tight.
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
        <Icons.forward aria-hidden="true" className="h-4 w-4" />
      </button>
    </nav>
  );
}
