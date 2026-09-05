"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils/cn";

/** The only banner drawn so far, standing in for the ones that come after it. */
const BANNER = {
  src: "/images/hero/banner-1.webp",
  mobile: "/images/hero/banner-1-mobile.webp",
  alt: "Cumperi sau vinzi, faci un bine. Cauze verificate și o donație la fiecare licitație.",
};

/**
 * What the slider shows.
 *
 * <p>One entry per panel; drop the files into `public/images/hero` and name them here. `alt` is
 * what a reader who cannot see the banner is told it says, `href` is optional and a panel without
 * one is not a link, and `mobile` is the same banner drawn for the taller crop a phone gets —
 * without it the desktop file is used at both widths and loses its sides to `object-cover`.
 */
const SLIDES: { src: string; mobile?: string; alt: string; href?: string }[] = [
  BANNER,
  BANNER,
  BANNER,
];

/** How many blank panels stand in while there are none, so the control is there to be looked at. */
const PLACEHOLDERS = 3;

/** Long enough to read a panel before the next one takes its place. */
const AUTOPLAY_MS = 6000;

/**
 * The homepage banner as a slider: one panel at a time, swiped or stepped through.
 *
 * <p>Not rendered at the moment — there is only one banner drawn, and a slider carrying a single
 * panel is a set of controls that lead back to where they started, so the page opens on
 * `HeroBanner` instead. Kept whole because the second banner is the only thing it is waiting for:
 * name the files in `SLIDES` and swap which one the page imports.
 *
 * <p>Built on scroll snapping rather than on a transform, so a finger drags it natively at any
 * width and every control only ever asks the track to scroll — there is no second idea of which
 * panel is showing to fall out of step with what is on screen.
 *
 * <p>It runs one way for ever. The row carries a copy of the last panel before the first and a
 * copy of the first after the last, so going on from the end keeps moving in the same direction;
 * once a copy is reached the track is put on its real twin with no animation, which is invisible
 * because the two are the same picture. Without the copies the end of the row could only be left
 * by scrolling back across everything in it.
 */
export function HeroSlider() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [held, setHeld] = useState(false);
  /** True while the tab is in the background, where a panel would turn unseen. */
  const [away, setAway] = useState(false);

  const paused = held || away;

  /**
   * How many panels have been arrived at, which is only ever read for its parity.
   *
   * <p>Adjusted here rather than in an effect so the new panel and its restarted bar are drawn in
   * the same pass; an effect would paint one frame of the old bar first.
   */
  const [runs, setRuns] = useState(0);
  const [seen, setSeen] = useState(0);
  if (seen !== current) {
    setSeen(current);
    setRuns((count) => count + 1);
  }

  const count = SLIDES.length || PLACEHOLDERS;

  /** The real panels with a copy of each end wrapped around them: last, 0..n-1, first. */
  const panels = [count - 1, ...SLIDES.map((_, index) => index), 0];

  /** Where a real panel sits in that row. */
  const slotOf = (index: number) => index + 1;

  const scrollToSlot = (slot: number, smooth = true) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: track.clientWidth * slot,
      // `instant` rather than `auto`: `auto` defers to whatever `scroll-behavior`
      // the page has set, and a hand-off that animates is the one thing this jump
      // must never do — it would slide back across every panel in view.
      behavior: smooth ? "smooth" : "instant",
    });
  };

  /**
   * Opens on the first real panel rather than on the copy standing before it.
   *
   * <p>Set as the track is attached, before the browser has painted, rather than in an effect
   * afterwards: an effect runs after the first paint, and that paint is a frame of the last panel
   * showing where the first one is meant to be.
   */
  const attach = (node: HTMLDivElement | null) => {
    trackRef.current = node;
    if (node && node.scrollLeft === 0) node.scrollLeft = node.clientWidth;
  };

  // And again once the browser has laid the track out, for the case where it had
  // no width to go by yet: a track still sitting at nothing opens on the copy of
  // the last panel instead of on the first, and stays a panel out of step with
  // the bars for the rest of the round.
  useEffect(() => {
    const track = trackRef.current;
    if (track && track.scrollLeft === 0 && track.clientWidth > 0) {
      track.scrollLeft = track.clientWidth;
    }
  }, []);

  /**
   * Which panel the track is on, and the hand-off when it comes to rest on a copy.
   *
   * <p>Read off the track rather than remembered separately: a swipe moves the panel without
   * asking anybody, and the bars have to follow that too.
   *
   * <p>The hand-off waits for the scroll to arrive. Rounding alone would call it a copy from
   * halfway across the gap, and moving the track then would cut the slide in half; measuring
   * against the panel it has landed on means the jump happens with nothing in motion, onto the
   * same picture, so there is nothing to see.
   */
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

  /** One panel on or back, always onward through a copy rather than back across the row. */
  const step = (delta: number) => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    scrollToSlot(Math.round(track.scrollLeft / track.clientWidth) + delta);
  };

  /**
   * What actually moves the banner on.
   *
   * <p>The bar underneath is drawn by an animation of the same length, but the animation is only
   * ever the picture of the wait — it was the cue at first, and a panel whose animation the
   * browser throttled or never ran simply stopped advancing. A timer cannot be throttled into
   * stopping, and it is reset by the same things that reset the bar: a new panel, or a pointer.
   */
  useEffect(() => {
    if (count < 2 || paused) return;
    const timer = window.setTimeout(() => step(1), AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, count, paused]);

  // No button for this: it stops when a pointer or the focus is on it, and
  // when the tab is not the one being looked at. Those are the moments a
  // reader is either using it or not there, and nothing else needs saying.
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
            // Lenis owns the wheel, and without this a trackpad swipe over the
            // banner scrolls the page instead of the panels.
            data-lenis-prevent
            // 2:1 on a phone and 4:1 from `sm`: a quarter of 375px is a strip
            // too shallow to read, and the height only pays for itself because
            // the slide carries art composed for it. A slide without `mobile`
            // would be letterboxed into the taller frame instead.
            className="no-scrollbar flex aspect-[2/1] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl bg-ink-100 sm:aspect-[4/1] sm:rounded-3xl"
          >
            {panels.map((index, slot) => {
              const slide = SLIDES[index];
              // The panel it opens on and the copy standing beside it; the rest
              // can wait until they are scrolled towards.
              const eager = slot <= 1;
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

              // A copy is furniture: it says nothing a reader has not just
              // been told, and it is not a second place to be sent to.
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

          {/* Pointer widths only: on a phone the panel is dragged, and an arrow
              laid over it covers what it is there to show. Neither is ever a
              dead control: both ends carry on into a copy. */}
          <Arrow side="left" onClick={() => step(-1)} />
          <Arrow side="right" onClick={() => step(1)} />
        </div>

        {/* Under the banner rather than on it: the bar is a clock as much as a
            place marker, and a countdown drawn over artwork is read as part of
            the artwork. */}
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
                {/* One element per bar for the life of the slider, and every
                    state of it written as a transform. Replacing the element to
                    restart the countdown is what made the wrap look wrong: the
                    bar being left behind was replaced too, so it blinked empty
                    while its neighbour was still gliding down, and the eye read
                    the neighbour as the one being filled. Alternating the
                    animation's name restarts it in place instead.

                    Filling is the only thing given a transition. A bar emptying
                    is not a thing happening — it is the round starting over, and
                    drawn as a movement it looks like the countdown running
                    backwards through the bars it has already been through.

                    Written as `transform` rather than with `scale-x-*`, which in
                    Tailwind v4 is the standalone `scale` property: it multiplies
                    the animation instead of giving way to it, and a bar carrying
                    `scale-x-0` counts down from nothing to nothing. */}
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
        // No disc, no fill and no shadow: the chevron itself is the control.
        // Pale enough to sit on the artwork without competing with it, and
        // green under the cursor, which is where it needs to be found rather
        // than seen. Narrow and tall, so it takes a band at the edge of the
        // banner rather than a corner of it.
        "absolute top-1/2 hidden w-10 -translate-y-1/2 place-items-center transition",
        "h-3/4 text-ink-200 hover:text-primary-500",
        "sm:grid",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {/* Drawn here rather than taken from the icon set, which is built on a
          square box: this one is a third as wide as it is tall, so it reads as a
          long stroke rather than as a glyph, with its ends and its corner
          rounded off so the stroke has no hard points on it. */}
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
