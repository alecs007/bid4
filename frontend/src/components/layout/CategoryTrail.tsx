"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { CategoryIcon } from "@/components/ui";
import { AUCTION_CATEGORIES } from "@/lib/config";
import { cn } from "@/lib/utils/cn";

const STEP_RATIO = 0.8;

export function CategoryTrail({ className }: { className?: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => {
      const maxScroll = rail.scrollWidth - rail.clientWidth;
      setEdges({
        left: rail.scrollLeft > 1,
        right: rail.scrollLeft < maxScroll - 1,
      });
    };

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
