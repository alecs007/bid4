"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

import { Lightbox } from "./Lightbox";

const RAIL_VISIBLE = 4;

const SETTLE_MS = 140;

function jump(track: HTMLDivElement, left: number) {
  track.style.scrollSnapType = "none";
  track.style.scrollBehavior = "auto";
  track.scrollLeft = left;
  track.style.scrollBehavior = "";
  track.style.scrollSnapType = "";
}

export function Gallery({
  images,
  alt,
  actions,
}: {
  images: string[];
  alt: string;
  actions?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [railStart, setRailStart] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const count = images.length;
  const current = images[active] ?? images[0] ?? "";

  const looped = count > 1;
  const slides = looped ? [images[count - 1], ...images, images[0]] : images;
  const slot = useCallback((i: number) => (looped ? i + 1 : i), [looped]);

  const activeRef = useRef(0);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

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
      const track = trackRef.current;
      if (track?.clientWidth) {
        track.scrollTo({ left: slot(next) * track.clientWidth, behavior: "smooth" });
      }
    },
    [count, slot],
  );

  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const width = track.clientWidth;
    if (!width) return;
    const position = Math.round(track.scrollLeft / width);
    const real = looped
      ? (position - 1 + count) % count
      : Math.min(count - 1, Math.max(0, position));
    setActive(real);
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !looped) return;

    let timer: number | undefined;

    const rewind = () => {
      const width = track.clientWidth;
      if (!width) return;
      const exact = track.scrollLeft / width;
      const position = Math.round(exact);
      if (Math.abs(exact - position) > 0.01) return;
      if (position !== 0 && position !== count + 1) return;
      jump(track, (position === 0 ? count : 1) * width);
    };

    const onQuiet = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(rewind, SETTLE_MS);
    };

    track.addEventListener("scroll", onQuiet, { passive: true });
    track.addEventListener("pointerdown", rewind, { passive: true });
    return () => {
      window.clearTimeout(timer);
      track.removeEventListener("scroll", onQuiet);
      track.removeEventListener("pointerdown", rewind);
    };
  }, [looped, count]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const park = () => {
      const width = track.clientWidth;
      if (!width) return;
      const target = slot(activeRef.current) * width;
      if (Math.abs(track.scrollLeft - target) < 1) return;
      jump(track, target);
    };

    park();
    const observer = new ResizeObserver(park);
    observer.observe(track);
    return () => observer.disconnect();
  }, [slot]);

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
                      draggable={false}
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
          <div className="frame-empty group relative hidden aspect-4/3 w-full overflow-hidden rounded-2xl lg:block">
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
              loading="eager"
              fetchPriority="high"
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="animate-fade-in object-contain transition-transform duration-300 group-hover:scale-[1.02]"
              draggable={false}
            />
            <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-xl bg-white/90 px-2.5 py-1.5 text-xs font-bold text-ink-700 opacity-0 transition group-hover:opacity-100">
              <Icons.search aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              Mărește
            </span>
          </button>

          {count > 1 ? (
            <>
              <StageArrow direction="prev" onClick={() => show(active - 1)} />
              <StageArrow direction="next" onClick={() => show(active + 1)} />
            </>
          ) : null}
          </div>

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
              className="frame-empty no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-2xl"
            >
              {slides.map((image, position) => {
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
                      loading={position <= 1 ? "eager" : "lazy"}
                      fetchPriority={position <= 1 ? "high" : "auto"}
                      sizes="100vw"
                      className="object-contain"
                      draggable={false}
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
          startIndex={active}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

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
