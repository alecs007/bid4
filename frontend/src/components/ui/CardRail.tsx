"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

/**
 * A horizontal rail of cards: swipe on a phone, arrows on a pointer.
 *
 * The arrows only appear once there is something off-screen to reach, and each
 * one disables itself at its end — a control that scrolls nowhere is worse
 * than no control. `data-lenis-prevent` keeps the smooth-scroll wrapper from
 * swallowing the horizontal gesture.
 */
export function CardRail({
  children,
  ariaLabel,
  heading,
  action,
  className,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  /** Rendered on the header row, with the arrows at its right. */
  heading?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      setEdges({
        start: rail.scrollLeft > 8,
        // A pixel of slack: sub-pixel widths otherwise leave it always true.
        end: rail.scrollLeft < max - 8,
      });
    };

    const initial = window.setTimeout(measure, 0);
    rail.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });

    return () => {
      window.clearTimeout(initial);
      rail.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  const scrollBy = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    // Just under a full view, so the card at the edge stays as an anchor.
    rail.scrollBy({ left: direction * rail.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrow = (direction: 1 | -1) => {
    const enabled = direction === -1 ? edges.start : edges.end;
    return (
      <button
        type="button"
        onClick={() => scrollBy(direction)}
        disabled={!enabled}
        aria-label={direction === -1 ? "Înapoi" : "Înainte"}
        className={cn(
          "hidden h-9 w-9 items-center justify-center rounded-xl bg-white ring-1 ring-edge transition md:inline-flex",
          enabled
            ? "text-ink-700 hover:ring-ink-300"
            : "cursor-not-allowed text-ink-300",
        )}
      >
        <Icons.crumb
          aria-hidden="true"
          className={cn("h-4 w-4", direction === -1 && "rotate-180")}
        />
      </button>
    );
  };

  const scrollable = edges.start || edges.end;

  return (
    <div className={className}>
      {heading || action || scrollable ? (
        <div className="mb-4 flex items-center justify-between gap-3">
          {heading}
          <div className="flex min-w-0 items-center gap-1.5">
            {action}
            {scrollable ? (
              <div className="ml-1 flex gap-1.5">
                {arrow(-1)}
                {arrow(1)}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        ref={railRef}
        data-lenis-prevent
        role="group"
        aria-label={ariaLabel}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:gap-4 sm:px-0"
      >
        {children}
      </div>
    </div>
  );
}
