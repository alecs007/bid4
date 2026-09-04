"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

/**
 * Kept at module scope so an overlay can freeze the page behind it. Lenis drives
 * the scroll, so `overflow: hidden` on the root stops the bar but not the wheel.
 */
let instance: Lenis | null = null;

export function setPageScrollLocked(locked: boolean): void {
  if (locked) instance?.stop();
  else instance?.start();
}

/**
 * How a page change travels: long enough to be followed, short enough not to be waited on.
 *
 * <p>Lenis's own default starts at full speed and decelerates, which from halfway down a
 * catalogue reads as being thrown at the top rather than taken there. Easing both ends is the
 * whole difference, and at 1.2s it was the reader watching an animation finish before their
 * results appeared — the glide and the hold after it are spent twice on every page button.
 */
const PAGE_SCROLL_SECONDS = 0.7;

/** Symmetric ease. Slow at both ends, quickest in the middle where nothing is being read. */
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * The backstop that guarantees `onComplete` even when the glide never reports back.
 *
 * <p>Derived from the duration rather than picked, and comfortably past it: a backstop that can
 * fire mid-scroll is worse than none, because whatever was waiting on it then changes the page
 * out from under a scroll that is still running.
 */
const SCROLL_TIMEOUT_MS = PAGE_SCROLL_SECONDS * 1000 + 400;

/**
 * Move the page from code — a new page of results, a filter, anything that should put the reader
 * back at the top of what they asked for.
 *
 * <p>Never `window.scrollTo({ behavior: "smooth" })` while Lenis is running. Lenis holds its own
 * target and animates towards it every frame; a native smooth scroll animates the same property at
 * the same time, and the two fight — the page lurches, or arrives and is dragged back. Going
 * through Lenis is the difference between the paged lists gliding and stuttering.
 *
 * <p>Falls back to the native call when Lenis is absent, which is the case under
 * `prefers-reduced-motion` — where an instant jump is the right answer anyway.
 */
export function scrollPageTo(
  target: number | HTMLElement,
  {
    immediate = false,
    offset = 0,
    onComplete,
  }: {
    immediate?: boolean;
    offset?: number;
    /** Called once the page has arrived — or given up on arriving. */
    onComplete?: () => void;
  } = {},
): void {
  // Fired once, and fired no matter what. A caller holding its placeholders
  // until the page lands must not be left holding them because the reader
  // grabbed the wheel mid-glide, or because Lenis is not running at all.
  let settled = false;
  const done = () => {
    if (settled) return;
    settled = true;
    onComplete?.();
  };
  if (onComplete) window.setTimeout(done, SCROLL_TIMEOUT_MS);

  const top =
    typeof target === "number"
      ? target + offset
      : target.getBoundingClientRect().top + window.scrollY + offset;

  // Already there. Nothing to animate, and holding a page of skeletons for a
  // scroll that never happens is worse than the jump it was there to cover.
  if (Math.abs(window.scrollY - top) < 2) {
    done();
    return;
  }

  const lenis = instance;
  if (lenis) {
    lenis.scrollTo(target, {
      offset,
      immediate,
      duration: immediate ? undefined : PAGE_SCROLL_SECONDS,
      easing: easeInOutCubic,
      onComplete: done,
    });
    return;
  }

  window.scrollTo({ top, behavior: immediate ? "instant" : "smooth" });
  if (immediate) done();
}

export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const previousPath = useRef(pathname);

  useEffect(() => {
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const lenis = new Lenis({
      duration: 0.9,
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      syncTouch: false,
    });
    lenisRef.current = lenis;
    instance = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    const observer = new ResizeObserver(() => lenis.resize());
    observer.observe(document.documentElement);
    observer.observe(document.body);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
      instance = null;
    };
  }, []);

  /**
   * `useLayoutEffect`, so a new page is at the top before its first paint. Lenis
   * owns the scroll position, so moving the window alone is undone next frame.
   */
  useLayoutEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;

    // A link into an anchor on another page gets to keep its target.
    if (window.location.hash) return;

    const lenis = lenisRef.current;
    if (lenis) {
      lenis.stop();
      lenis.scrollTo(0, { immediate: true, force: true });
      lenis.start();
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // The incoming page is a different height; Lenis caches that on resize.
    requestAnimationFrame(() => lenisRef.current?.resize());
  }, [pathname]);

  return null;
}
