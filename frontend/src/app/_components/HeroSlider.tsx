"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";

const BANNER = {
  src: "/images/hero/banner-1.webp",
  mobile: "/images/hero/banner-1-mobile.webp",
  alt: "Cumperi sau vinzi, faci un bine. Cauze verificate și o donație la fiecare licitație.",
};

const SLIDES: { src: string; mobile?: string; alt: string; href?: string }[] = [
  BANNER,
  BANNER,
  BANNER,
];

const PLACEHOLDERS = 3;

const AUTOPLAY_MS = 6000;

export function HeroSlider() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [held, setHeld] = useState(false);
  const [away, setAway] = useState(false);

  const paused = held || away;

  const [runs, setRuns] = useState(0);
  const [seen, setSeen] = useState(0);
  if (seen !== current) {
    setSeen(current);
    setRuns((count) => count + 1);
  }

  const count = SLIDES.length || PLACEHOLDERS;

  const panels = [count - 1, ...SLIDES.map((_, index) => index), 0];

  const slotOf = (index: number) => index + 1;

  const scrollToSlot = (slot: number, smooth = true) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: track.clientWidth * slot,
      behavior: smooth ? "smooth" : "instant",
    });
  };

  const attach = (node: HTMLDivElement | null) => {
    trackRef.current = node;
    if (node && node.scrollLeft === 0) node.scrollLeft = node.clientWidth;
  };

  useEffect(() => {
    const track = trackRef.current;
    if (track && track.scrollLeft === 0 && track.clientWidth > 0) {
      track.scrollLeft = track.clientWidth;
    }
  }, []);

  const follow = () => {
    const track = trackRef.current;
    const width = track?.clientWidth ?? 0;
    if (!track || width === 0) return;

    const at = track.scrollLeft / width;
    const slot = Math.round(at);
    const arrived = Math.abs(at - slot) < 0.01;

    if (arrived && (slot === 0 || slot === panels.length - 1)) {
      const index = slot === 0 ? count - 1 : 0;
      setCurrent(index);
      scrollToSlot(slotOf(index), false);
      return;
    }
    setCurrent(Math.min(count - 1, Math.max(0, slot - 1)));
  };

  const step = (delta: number) => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    scrollToSlot(Math.round(track.scrollLeft / track.clientWidth) + delta);
  };

  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setTimeout(() => step(1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, count, paused]);

  useEffect(() => {
    const watch = () => setAway(document.hidden);
    watch();
    document.addEventListener("visibilitychange", watch);
    return () => document.removeEventListener("visibilitychange", watch);
  }, []);

  return (
    <section
      aria-roledescription="carusel"
      aria-label="Noutăți bid4"
      className="bg-white"
    >
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-6 sm:px-6 sm:pt-6 lg:px-8">
        <div
          className="group relative"
          onPointerEnter={() => setHeld(true)}
          onPointerLeave={() => setHeld(false)}
          onFocusCapture={() => setHeld(true)}
          onBlurCapture={() => setHeld(false)}
        >
          <div
            ref={attach}
            onScroll={follow}
            data-lenis-prevent
            className="no-scrollbar flex aspect-square w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl bg-ink-100 ring-1 ring-primary-500/15 sm:aspect-[4/1] sm:rounded-3xl"
          >
            {panels.map((index, slot) => {
              const slide = SLIDES[index];
              const eager = slot <= 1;
              const panel = slide ? (
                <>
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    unoptimized
                    sizes="(min-width: 1280px) 1216px, 100vw"
                    loading={eager ? "eager" : "lazy"}
                    priority={eager}
                    className={cn(
                      "object-cover",
                      slide.mobile && "hidden sm:block",
                    )}
                    draggable={false}
                  />
                  {slide.mobile ? (
                    <Image
                      src={slide.mobile}
                      alt={slide.alt}
                      fill
                      unoptimized
                      sizes="100vw"
                      loading={eager ? "eager" : "lazy"}
                      priority={eager}
                      className="object-cover sm:hidden"
                      draggable={false}
                    />
                  ) : null}
                </>
              ) : null;

              const copy = slot === 0 || slot === panels.length - 1;

              return (
                <div
                  key={slot}
                  role={copy ? "presentation" : "group"}
                  aria-hidden={copy || undefined}
                  aria-roledescription={copy ? undefined : "panou"}
                  aria-label={copy ? undefined : `${index + 1} din ${count}`}
                  className="relative h-full w-full shrink-0 snap-start overflow-hidden"
                >
                  {slide?.href && !copy ? (
                    <Link href={slide.href} className="absolute inset-0">
                      {panel}
                    </Link>
                  ) : (
                    panel
                  )}
                </div>
              );
            })}
          </div>

          <Arrow side="left" onClick={() => step(-1)} />
          <Arrow side="right" onClick={() => step(1)} />
        </div>

        <div className="mt-2.5 flex justify-center gap-1.5">
          {Array.from({ length: count }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => scrollToSlot(slotOf(index))}
              aria-label={`Panoul ${index + 1}`}
              aria-current={index === current}
              className="group/bar h-3 w-10 py-1"
            >
              <span className="block h-1 w-full overflow-hidden rounded-full bg-ink-200 transition group-hover/bar:bg-ink-300">
                <span
                  style={
                    index === current
                      ? {
                          animationName:
                            runs % 2 === 0
                              ? "slide-progress"
                              : "slide-progress-alt",
                          animationDuration: `${AUTOPLAY_MS}ms`,
                          animationTimingFunction: "linear",
                          animationFillMode: "forwards",
                          animationPlayState: paused ? "paused" : "running",
                        }
                      : {
                          transform:
                            index < current ? "scaleX(1)" : "scaleX(0)",
                        }
                  }
                  className={cn(
                    "block h-full origin-left rounded-full bg-primary-500",
                    index < current &&
                      "transition-transform duration-300 ease-[var(--ease-out-soft)]",
                  )}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Arrow({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "left" ? "Panoul anterior" : "Panoul următor"}
      className={cn(
        "absolute top-1/2 hidden w-10 -translate-y-1/2 place-items-center transition",
        "h-3/4 text-ink-200 hover:text-primary-500",
        "sm:grid",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 12 40"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn("h-16 w-5", side === "left" && "rotate-180")}
      >
        <path d="M2 2 L10 20 L2 38" />
      </svg>
    </button>
  );
}
