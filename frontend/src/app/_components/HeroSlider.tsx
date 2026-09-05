"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

/**
 * What the slider shows.
 *
 * <p>One entry per panel; drop the files into `public/images/hero` and name them here. `alt` is
 * what a reader who cannot see the banner is told it says, `href` is optional and a panel without
 * one is not a link, and `mobile` is the same banner drawn for the taller crop a phone gets —
 * without it the desktop file is used at both widths and loses its sides to `object-cover`.
 */
const SLIDES: { src: string; mobile?: string; alt: string; href?: string }[] = [
  {
    src: "/images/hero/banner-1.webp",
    mobile: "/images/hero/banner-1-mobile.webp",
    alt: "Cumperi sau vinzi, faci un bine. Cauze verificate și o donație la fiecare licitație.",
  },
];

/** How many blank panels stand in until then, so the control is there to be looked at. */
const PLACEHOLDERS = 3;

/** Long enough to read a panel before the next one takes its place. */
const AUTOPLAY_MS = 6000;

/**
 * The banner the homepage opens on: one 4:1 panel at a time, swiped or stepped through.
 *
 * <p>Built on scroll snapping rather than on a transform, so a finger drags it natively at any
 * width and the arrows and dots only ever ask the track to scroll — there is no second idea of
 * which panel is showing to fall out of step with what is on screen.
 */
export function HeroSlider() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [held, setHeld] = useState(false);

  const count = SLIDES.length || PLACEHOLDERS;

  const goTo = (index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const next = Math.max(0, Math.min(count - 1, index));
    track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
  };

  // Read off the track rather than remembered separately: a swipe moves the
  // panel without asking anybody, and the dots have to follow that too.
  const follow = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setCurrent(Math.round(track.scrollLeft / track.clientWidth));
  };

  /**
   * Advances on its own, and reads where it is from the track rather than from
   * `current` — so the interval is set up once instead of being torn down and
   * replaced on every panel, and a panel someone swiped to is where it carries
   * on from.
   *
   * <p>Stopped while a pointer is on it, while the focus is inside it, and while
   * the tab is in the background: a banner that moved on unwatched has already
   * shown its panel to nobody.
   */
  useEffect(() => {
    if (count < 2 || held) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(() => {
      const track = trackRef.current;
      if (!track || track.clientWidth === 0 || document.hidden) return;
      const next =
        (Math.round(track.scrollLeft / track.clientWidth) + 1) % count;
      track.scrollTo({ left: track.clientWidth * next, behavior: "smooth" });
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [count, held]);

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
            ref={trackRef}
            onScroll={follow}
            // Lenis owns the wheel, and without this a trackpad swipe over the
            // banner scrolls the page instead of the panels.
            data-lenis-prevent
            // 2:1 on a phone and 4:1 from `sm`: a quarter of 375px is a strip
            // too shallow to read, and the height only pays for itself because
            // the slide carries art composed for it. A slide without `mobile`
            // would be letterboxed into the taller frame instead.
            className="no-scrollbar flex aspect-[2/1] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl bg-ink-100 sm:aspect-[4/1] sm:rounded-3xl"
          >
            {Array.from({ length: count }, (_, index) => {
              const slide = SLIDES[index];
              const eager = index === 0;
              const panel = slide ? (
                <>
                  <Image
                    src={slide.src}
                    alt={slide.alt}
                    fill
                    // Already sized and encoded for this slot, so it is served
                    // as made rather than re-compressed on top at q75.
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
                    // The same banner drawn for 2:1. Two elements rather than
                    // one source set, because this is a different composition
                    // and not the same picture at another size.
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

              return (
                <div
                  key={index}
                  role="group"
                  aria-roledescription="panou"
                  aria-label={`${index + 1} din ${count}`}
                  className="relative h-full w-full shrink-0 snap-start overflow-hidden"
                >
                  {slide?.href ? (
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

          {count > 1 ? (
            <>
              {/* Pointer widths only: on a phone the panel is dragged, and an
                  arrow laid over it covers what it is there to show. */}
              <Arrow
                side="left"
                disabled={current === 0}
                onClick={() => goTo(current - 1)}
              />
              <Arrow
                side="right"
                disabled={current === count - 1}
                onClick={() => goTo(current + 1)}
              />

              {/* On the banner rather than under it: they belong to the
                  panel they count, and a row beneath adds height to a band
                  whose whole point is its proportion. */}
              <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5 sm:bottom-3">
                {Array.from({ length: count }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => goTo(index)}
                    aria-label={`Panoul ${index + 1}`}
                    aria-current={index === current}
                    className={cn(
                      "h-1.5 rounded-full transition-[width,background-color] duration-300 ease-[var(--ease-out-soft)]",
                      index === current
                        ? "w-5 bg-white"
                        : "w-1.5 bg-white/60 hover:bg-white/80",
                    )}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Arrow({
  side,
  disabled,
  onClick,
}: {
  side: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === "left" ? "Panoul anterior" : "Panoul următor"}
      className={cn(
        // No disc and no fill: the chevron is the control. A shadow rather than
        // a surface is what keeps it legible over artwork nobody has chosen yet.
        "absolute top-1/2 hidden h-16 w-12 -translate-y-1/2 place-items-center text-white transition",
        "drop-shadow-[0_1px_3px_rgba(0,0,0,0.45)] hover:scale-110",
        "disabled:pointer-events-none disabled:opacity-0",
        "sm:grid",
        side === "left" ? "left-1" : "right-1",
      )}
    >
      {/* Drawn long and thin rather than large: at a heavier weight a chevron
          this size reads as a chunk of furniture sitting on the artwork. */}
      <Icons.crumb
        aria-hidden="true"
        strokeWidth={1.5}
        className={cn("h-10 w-10", side === "left" && "rotate-180")}
      />
    </button>
  );
}
