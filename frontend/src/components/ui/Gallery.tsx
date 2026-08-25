"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

import { Lightbox } from "./Lightbox";

/** How many thumbnails the desktop rail shows before it needs its arrows. */
const RAIL_VISIBLE = 4;

/**
 * A vertical thumbnail rail beside the photograph on a desktop, one swipeable
 * photograph with dots on a phone, and the same lightbox behind both.
 */
export function Gallery({
  images,
  alt,
  actions,
}: {
  images: string[];
  alt: string;
  /** Floated over the photograph on a phone, where there is no room beside it. */
  actions?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [railStart, setRailStart] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const count = images.length;
  const current = images[active] ?? images[0] ?? "";

  const show = useCallback(
    (index: number) => {
      if (count === 0) return;
      const next = (index + count) % count;
      setActive(next);
      setRailStart((start) => {
        if (next < start) return next;
        if (next >= start + RAIL_VISIBLE) return next - RAIL_VISIBLE + 1;
        return start;
      });
    },
    [count],
  );

  // The phone rail is a real scroller, so the dots follow the scroll position
  // rather than the other way round.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    setActive(Math.min(count - 1, Math.max(0, index)));
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const target = active * track.clientWidth;
    if (Math.abs(track.scrollLeft - target) > 4) {
      track.scrollTo({ left: target, behavior: "smooth" });
    }
  }, [active]);

  if (count === 0) return null;

  const railEnd = Math.min(railStart + RAIL_VISIBLE, count);
  const canScrollUp = railStart > 0;
  const canScrollDown = railEnd < count;

  return (
    <>
      <div className="flex gap-3">
        {/* --- desktop rail ------------------------------------------- */}
        {count > 1 ? (
          <div className="hidden w-16 shrink-0 flex-col items-center gap-1.5 lg:flex">
            <RailArrow
              direction="up"
              disabled={!canScrollUp}
              onClick={() => setRailStart((start) => Math.max(0, start - 1))}
            />

            <div className="flex w-full flex-col gap-2">
              {images.slice(railStart, railEnd).map((image, offset) => {
                const index = railStart + offset;
                return (
                  <button
                    key={image}
                    type="button"
                    onClick={() => show(index)}
                    aria-label={`Imaginea ${index + 1} din ${count}`}
                    aria-current={index === active}
                    className={cn(
                      "relative aspect-square w-full overflow-hidden rounded-2xl bg-ink-50 ring-2 transition",
                      index === active
                        ? "ring-primary-500"
                        : "ring-transparent hover:ring-ink-300",
                    )}
                  >
                    <Image
                      src={image}
                      alt=""
                      fill
                      unoptimized
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                );
              })}
            </div>

            <RailArrow
              direction="down"
              disabled={!canScrollDown}
              onClick={() =>
                setRailStart((start) =>
                  Math.min(count - RAIL_VISIBLE, start + 1),
                )
              }
            />
          </div>
        ) : null}

        {/* --- the photograph ------------------------------------------ */}
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Vezi imaginile mărite"
            className="group relative hidden aspect-4/3 w-full cursor-zoom-in overflow-hidden rounded-2xl bg-ink-50 lg:block"
          >
            <Image
              key={current}
              src={current}
              alt={alt}
              fill
              unoptimized
              priority
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="animate-fade-in object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-2.5 py-1.5 text-xs font-bold text-ink-700 opacity-0 transition group-hover:opacity-100">
              <Icons.search aria-hidden="true" className="h-3.5 w-3.5" />
              Mărește
            </span>
          </button>

          {/* phone: one image per screen, swiped */}
          <div className="relative lg:hidden">
            {actions ? (
              <div className="absolute top-3 right-3 z-10 flex gap-1.5">
                {actions}
              </div>
            ) : null}
            <div
              ref={trackRef}
              onScroll={onScroll}
              data-lenis-prevent
              className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl bg-ink-50"
            >
              {images.map((image, index) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => {
                    setActive(index);
                    setOpen(true);
                  }}
                  aria-label={`Imaginea ${index + 1} din ${count}`}
                  className="relative aspect-4/3 w-full shrink-0 snap-center"
                >
                  <Image
                    src={image}
                    alt={index === 0 ? alt : ""}
                    fill
                    unoptimized
                    priority={index === 0}
                    sizes="100vw"
                    className="object-contain"
                  />
                </button>
              ))}
            </div>

            {count > 1 ? (
              <div className="mt-2.5 flex items-center justify-center gap-1.5">
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => show(index)}
                    aria-label={`Mergi la imaginea ${index + 1}`}
                    aria-current={index === active}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      index === active
                        ? "w-5 bg-ink-800"
                        : "w-1.5 bg-ink-300 hover:bg-ink-400",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {open ? (
        <Lightbox
          images={images}
          alt={alt}
          index={active}
          onIndexChange={show}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function RailArrow({
  direction,
  disabled,
  onClick,
}: {
  direction: "up" | "down";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "up" ? "Imaginile de mai sus" : "Imaginile de mai jos"}
      className={cn(
        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition",
        disabled
          ? "cursor-not-allowed text-ink-300"
          : "text-ink-700 hover:bg-ink-100",
      )}
    >
      <Icons.expand
        aria-hidden="true"
        className={cn("h-4 w-4", direction === "up" && "rotate-180")}
      />
    </button>
  );
}
