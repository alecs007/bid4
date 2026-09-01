"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { CategoryIcon } from "@/components/ui";
import { AUCTION_CATEGORIES } from "@/lib/config";
import { cn } from "@/lib/utils/cn";

/** How far one press of an arrow travels, as a share of what is on screen. */
const STEP_RATIO = 0.8;

/**
 * The categories, as a rail under the header.
 *
 * <p>A shortcut rather than a navigation bar: it sits on the pages where somebody is looking at
 * one thing and might want another kind of thing, and nowhere else. On /licitatii it would be a
 * second, worse copy of the filter panel already on the page.
 *
 * <p>Arrows are desktop-only and appear only when there is somewhere to go. A phone scrolls the
 * rail with a thumb, so arrows there would cover the very items they scroll to.
 */
export function CategoryTrail({ className }: { className?: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      // A pixel of slack: sub-pixel widths otherwise leave an arrow lit at the
      // end of the rail with nothing left to scroll to.
      const maxScroll = rail.scrollWidth - rail.clientWidth;
      setEdges({
        left: rail.scrollLeft > 1,
        right: rail.scrollLeft < maxScroll - 1,
      });
    };

    // ResizeObserver fires once on observe, which is where the first
    // measurement comes from: taking it in the effect body would be a setState
    // during render's commit, and React asks that it not be.
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    rail.addEventListener("scroll", measure, { passive: true });

    return () => {
      observer.disconnect();
      rail.removeEventListener("scroll", measure);
    };
  }, []);

  const scrollBy = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({
      left: direction * rail.clientWidth * STEP_RATIO,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("relative bg-white", className)}>
      <nav
        aria-label="Categorii"
        className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        {/* data-lenis-prevent: the page runs on smooth scroll, which otherwise
            swallows a horizontal wheel gesture aimed at this rail. */}
        <div
          ref={railRef}
          data-lenis-prevent
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto scroll-smooth pb-2 lg:justify-between lg:gap-2"
        >
          {AUCTION_CATEGORIES.map((category) => (
            <Link
              key={category.id}
              href={`/licitatii?category=${category.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-ink-50 px-2.5 py-1.5 text-sm font-bold whitespace-nowrap text-ink-700 transition hover:bg-ink-100 hover:text-ink-900"
            >
              <CategoryIcon
                set="categories"
                id={category.id}
                className="h-5 w-5 shrink-0"
                sizes="20px"
              />
              {category.label}
            </Link>
          ))}
        </div>
      </nav>

      <TrailArrow side="left" show={edges.left} onClick={() => scrollBy(-1)} />
      <TrailArrow side="right" show={edges.right} onClick={() => scrollBy(1)} />
    </div>
  );
}

/**
 * One end of the rail.
 *
 * <p>Kept mounted and faded rather than unmounted, so arriving at an end does not reflow the row
 * under the cursor. Hidden from assistive tech entirely: the rail is a list of links that can be
 * tabbed through, and these only move the viewport.
 */
function TrailArrow({
  side,
  show,
  onClick,
}: {
  side: "left" | "right";
  show: boolean;
  onClick: () => void;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-y-0 hidden items-center transition-opacity duration-200 lg:flex",
        side === "left"
          ? "left-0 bg-gradient-to-r pl-2 pr-8"
          : "right-0 bg-gradient-to-l pr-2 pl-8",
        "from-white via-white to-transparent",
        show ? "opacity-100" : "opacity-0",
      )}
    >
      <button
        type="button"
        tabIndex={-1}
        onClick={onClick}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full bg-white text-ink-700 ring-1 ring-line transition hover:bg-ink-100 hover:text-ink-900",
          show ? "pointer-events-auto" : "pointer-events-none",
        )}
      >
        <Icons.expand
          className={cn(
            "h-4 w-4 shrink-0",
            side === "left" ? "rotate-90" : "-rotate-90",
          )}
        />
      </button>
    </div>
  );
}
