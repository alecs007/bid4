"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Lenis-driven smooth scrolling, and the route-change reset that goes with it.
 *
 * Lenis takes over the scroll position, so a plain `window.scrollTo` on
 * navigation fights it: the jump to top goes through Lenis instead, with
 * `immediate` so a new page starts at the top rather than gliding there.
 *
 * Overlays that scroll internally (the sheet, the select list) carry
 * `data-lenis-prevent`, which tells Lenis to leave their wheel events alone.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const previousPath = useRef(pathname);

  useEffect(() => {
    // Honour a reduced-motion preference: no smoothing, native scrolling.
    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;

    const lenis = new Lenis({
      duration: 0.9,
      // Gentle deceleration, matching the app's easing elsewhere.
      easing: (t: number) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
      // Touch devices already scroll well; smoothing them fights the platform.
      syncTouch: false,
    });
    lenisRef.current = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    /**
     * Lenis caches the scroll limit, so a page that grows after load — every
     * page here, since the rows arrive asynchronously — would stop scrolling
     * short of the bottom. Re-measure whenever the document changes height.
     */
    const observer = new ResizeObserver(() => lenis.resize());
    observer.observe(document.documentElement);
    observer.observe(document.body);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;

    const lenis = lenisRef.current;
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
