"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

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
    };
  }, []);

  /**
   * Land every new page at the top, before the first paint of that page —
   * `useLayoutEffect` rather than `useEffect`, so the view transition snapshots
   * a page that is already scrolled up instead of one that jumps afterwards.
   *
   * Lenis owns the scroll position while it is running, so telling only the
   * window to scroll would be undone on its next frame.
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
