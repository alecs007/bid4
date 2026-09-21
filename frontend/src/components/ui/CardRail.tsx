"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

const DRAG_THRESHOLD_PX = 4;

export function CardRail({
  children,
  ariaLabel,
  heading,
  action,
  className,
}: {
  children: React.ReactNode;
  ariaLabel: string;
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

  const scrollByView = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;

    const items = Array.from(rail.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement,
    );
    const first = items[0];
    if (!first) return;

    const railLeft = rail.getBoundingClientRect().left;
    const padding = Number.parseFloat(
      getComputedStyle(rail).scrollPaddingLeft || "0",
    );
    const stops = items.map(
      (item) =>
        rail.scrollLeft +
        (item.getBoundingClientRect().left - railLeft) -
        (Number.isFinite(padding) ? padding : 0),
    );

    const cardWidth = first.getBoundingClientRect().width;
    const step = stops.length > 1 ? stops[1]! - stops[0]! : cardWidth;
    if (step <= 0) return;
    const perView = Math.max(
      1,
      Math.floor((rail.clientWidth + step - cardWidth) / step),
    );

    let lead = 0;
    for (let index = 0; index < stops.length; index += 1) {
      if (stops[index]! <= rail.scrollLeft + 2) lead = index;
    }

    const target = Math.min(
      Math.max(lead + direction * perView, 0),
      items.length - 1,
    );
    const furthest = rail.scrollWidth - rail.clientWidth;
    rail.scrollTo({
      left: Math.min(Math.max(stops[target] ?? 0, 0), furthest),
      behavior: "smooth",
    });
  };

  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: false });

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return;
    const rail = railRef.current;
    if (!rail) return;

    drag.current = {
      active: true,
      startX: event.clientX,
      startLeft: rail.scrollLeft,
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!drag.current.active || !rail) return;

    const travelled = event.clientX - drag.current.startX;
    if (!drag.current.moved) {
      if (Math.abs(travelled) <= DRAG_THRESHOLD_PX) return;
      drag.current.moved = true;
      rail.setPointerCapture(event.pointerId);
    }
    rail.scrollLeft = drag.current.startLeft - travelled;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const rail = railRef.current;
    if (rail?.hasPointerCapture(event.pointerId)) {
      rail.releasePointerCapture(event.pointerId);
    }
  };

  const onClickCapture = (event: React.MouseEvent) => {
    if (!drag.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    drag.current.moved = false;
  };

  const arrow = (direction: 1 | -1) => {
    const enabled = direction === -1 ? edges.start : edges.end;
    return (
      <button
        type="button"
        onClick={() => scrollByView(direction)}
        disabled={!enabled}
        aria-label={direction === -1 ? "Înapoi" : "Înainte"}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-edge transition",
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
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className={cn(
          "no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-pl-4 gap-3 overflow-x-auto px-4 select-none sm:mx-0 sm:scroll-pl-0 sm:gap-4 sm:px-0",
          scrollable && "cursor-grab active:cursor-grabbing",
        )}
      >
        {children}
      </div>
    </div>
  );
}
