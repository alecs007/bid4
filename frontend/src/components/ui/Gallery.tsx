"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

import { Lightbox } from "./Lightbox";

/** How many thumbnails the desktop rail shows before it needs its arrows. */
const RAIL_VISIBLE = 4;

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

  /**
   * The phone track loops by carrying a copy of the last image before the first
   * and a copy of the first after the last. Swiping past either end lands on a
   * clone, and the scroll position is then moved to its twin with the animation
   * off — the picture under the finger is identical, so the seam is invisible
   * and the swipe can carry on in the same direction forever.
   *
   * <p>It stays a native scroller rather than a transformed track, because that
   * is what gives a phone its own momentum, rubber-banding and pointer handling.
   */
  const looped = count > 1;
  const slides = looped ? [images[count - 1], ...images, images[0]] : images;
  /** Where image `i` sits in the track above. */
  const slot = useCallback((i: number) => (looped ? i + 1 : i), [looped]);

  const jumping = useRef(false);

  const onScroll = () => {
    const track = trackRef.current;
    if (!track || jumping.current) return;
    const width = track.clientWidth;
    if (!width) return;
    const position = Math.round(track.scrollLeft / width);

    if (looped && (position === 0 || position === count + 1)) {
      // On a clone: hop to the real one it copies, without animating.
      const real = position === 0 ? count : 1;
      jumping.current = true;
      track.style.scrollBehavior = "auto";
      track.scrollLeft = real * width;
      track.style.scrollBehavior = "";
      requestAnimationFrame(() => {
        jumping.current = false;
      });
      setActive(real - 1);
      return;
    }

    setActive(Math.min(count - 1, Math.max(0, looped ? position - 1 : position)));
  };

  /**
   * Parks the track on the slide it is meant to be showing, without animating.
   *
   * <p>Driven by a resize observer rather than run once on mount, because the
   * track is `lg:hidden`: on a desktop first paint it has no width, so a mount-
   * time scroll would be a scroll to zero — which is the clone before the first
   * image, not the first image. This fires when it gains width, and again when
   * the phone is rotated, where the old offset would otherwise leave it parked
   * between two slides.
   */
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const park = () => {
      const width = track.clientWidth;
      if (!width) return;
      const target = slot(active) * width;
      if (Math.abs(track.scrollLeft - target) < 1) return;
      jumping.current = true;
      track.style.scrollBehavior = "auto";
      track.scrollLeft = target;
      track.style.scrollBehavior = "";
      requestAnimationFrame(() => {
        jumping.current = false;
      });
    };

    park();
    const observer = new ResizeObserver(park);
    observer.observe(track);
    return () => observer.disconnect();
    // Only the geometry matters here; `active` changes are animated by the
    // effect below instead of being snapped to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || jumping.current) return;
    const target = slot(active) * track.clientWidth;
    if (Math.abs(track.scrollLeft - target) > 4) {
      track.scrollTo({ left: target, behavior: "smooth" });
    }
  }, [active, slot]);

  if (count === 0) return null;

  const railEnd = Math.min(railStart + RAIL_VISIBLE, count);
  const canScrollUp = railStart > 0;
  const canScrollDown = railEnd < count;

  return (
    <>
      <div className="flex gap-3">
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

        <div className="min-w-0 flex-1">
          <div className="group relative hidden aspect-4/3 w-full overflow-hidden rounded-2xl bg-ink-50 lg:block">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Vezi imaginile mărite"
            className="absolute inset-0 h-full w-full cursor-zoom-in"
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
              <Icons.search aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              Mărește
            </span>
          </button>

          {/* Always there rather than on hover: arrows that appear when the
              pointer arrives are arrows nobody knows are there until they
              happen to sweep across the picture. */}
          {count > 1 ? (
            <>
              <StageArrow direction="prev" onClick={() => show(active - 1)} />
              <StageArrow direction="next" onClick={() => show(active + 1)} />
            </>
          ) : null}
          </div>

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
              {slides.map((image, position) => {
                // Clones stand outside the numbering: the copy at either end is
                // the same picture as its twin and must not be announced twice.
                const real = looped
                  ? (position - 1 + count) % count
                  : position;
                const clone = looped && (position === 0 || position === count + 1);
                return (
                  <button
                    key={`${position}-${image}`}
                    type="button"
                    onClick={() => {
                      setActive(real);
                      setOpen(true);
                    }}
                    aria-hidden={clone}
                    tabIndex={clone ? -1 : undefined}
                    aria-label={`Imaginea ${real + 1} din ${count}`}
                    className="relative aspect-4/3 w-full shrink-0 snap-center"
                  >
                    <Image
                      src={image}
                      alt={!clone && real === 0 ? alt : ""}
                      fill
                      unoptimized
                      priority={position <= 1}
                      sizes="100vw"
                      className="object-contain"
                    />
                  </button>
                );
              })}
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

/** Prev/next over the large image, above the click-to-zoom overlay. */
function StageArrow({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Imaginea anterioară" : "Imaginea următoare"}
      className={cn(
        "absolute top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl bg-white/85 text-ink-800 shadow-sm backdrop-blur-sm transition hover:bg-white",
        direction === "prev" ? "left-3" : "right-3",
      )}
    >
      <Icons.crumb
        aria-hidden="true"
        className={cn("h-5 w-5 shrink-0", direction === "prev" && "rotate-180")}
      />
    </button>
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
