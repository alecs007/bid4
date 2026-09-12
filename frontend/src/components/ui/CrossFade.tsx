"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * How long the placeholder and what replaces it overlap.
 *
 * <p>Longer than a fade needs to be, because the rows underneath are still arriving in sequence
 * behind it — the placeholder should still be on its way out while the first of them rise, not gone
 * before they start.
 */
const OVERLAP_MS = 480;

/**
 * A placeholder that gives way to its content rather than vanishing under it.
 *
 * <p>Swapping one for the other is a step however well the two are matched: the skeleton is removed
 * in a single frame and the content then fades up from nothing, so for a quarter of a second there
 * is neither. Both are held here instead, stacked, and their opacities crossed — the shapes stay on
 * screen throughout and only the shimmer goes.
 *
 * <p>The placeholder is the one that moves. It is taken out of the flow so the content alone decides
 * the height, which means a list that loads taller than its skeleton grows once, on arrival, rather
 * than again when the placeholder is dropped.
 *
 * <p>Nothing is held when the content is ready on the first render — a list coming back from the
 * cache has nothing to cross-fade from, and a fade there would be an animation invented for its own
 * sake.
 */
export function CrossFade({
  ready,
  placeholder,
  children,
  className,
}: {
  /** True once what is underneath is worth showing. */
  ready: boolean;
  placeholder: ReactNode;
  children: ReactNode;
  /** Anything the stack itself needs — a height, usually. */
  className?: string;
}) {
  const [held, setHeld] = useState(!ready);

  useEffect(() => {
    if (!ready || !held) return;
    const timer = window.setTimeout(() => setHeld(false), OVERLAP_MS);
    return () => window.clearTimeout(timer);
  }, [ready, held]);

  // Held covers the overlap; `!ready` covers a return to loading after it, so a
  // list that is asked to start again is not left showing an empty frame.
  const showing = !ready || held;

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-opacity duration-[450ms] ease-[var(--ease-out-soft)]",
          ready ? "opacity-100" : "opacity-0",
        )}
      >
        {children}
      </div>

      {showing ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-[450ms] ease-[var(--ease-out-soft)]",
            ready ? "opacity-0" : "opacity-100",
          )}
        >
          {placeholder}
        </div>
      ) : null}
    </div>
  );
}

/** How far apart two rows begin. */
const STAGGER_MS = 45;

/**
 * After this many, they arrive together.
 *
 * <p>A cascade is only legible for the first handful. Uncapped, the fortieth row of an inbox would
 * wait nearly two seconds for a flourish nobody is watching by then — and the rows appended further
 * down by scroll-loading would each wait longer than the last.
 */
const STAGGER_CAP = 8;

/**
 * Rows entering one after another rather than all at once.
 *
 * <p>Put on the row itself with `animate-fade-up`. A CSS animation runs when its element mounts, so
 * this plays for rows that are new and leaves the ones already on screen alone — which is what makes
 * a scroll-loaded page arrive in sequence without the list above it flickering.
 */
export function rowDelay(index: number): { animationDelay: string } {
  return { animationDelay: `${Math.min(index, STAGGER_CAP) * STAGGER_MS}ms` };
}

/**
 * The same cascade, counted from the end of a list rather than the start.
 *
 * <p>For a conversation, which opens at its newest message: the rows on screen are the last ones,
 * so counting from the front would give every one of them the same capped delay and they would all
 * arrive together. Counted from the back, the thread fills downwards and settles on the line the
 * reader is there to read.
 */
export function tailDelay(
  index: number,
  count: number,
  /** Milliseconds to wait before the cascade starts — room for a header above it. */
  offset = 0,
): { animationDelay: string } {
  // Against the shorter of the cap and the list itself. Measured from the cap
  // alone, a thread of four lines waited out the five steps it does not have
  // before the first of them appeared, and the stream sat empty meanwhile.
  const fromEnd = count - 1 - index;
  const steps = Math.max(0, Math.min(count, STAGGER_CAP) - fromEnd);
  return { animationDelay: `${offset + steps * STAGGER_MS}ms` };
}
