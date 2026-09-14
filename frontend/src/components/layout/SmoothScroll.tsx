"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

let instance: Lenis | null = null;

export function setPageScrollLocked(locked: boolean): void {
  if (locked) instance?.stop();
  else instance?.start();
}

const PAGE_SCROLL_SECONDS = 0.7;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const SCROLL_TIMEOUT_MS = PAGE_SCROLL_SECONDS * 1000 + 400;

export function scrollPageTo(
  target: number | HTMLElement,
  {
    immediate = false,
    offset = 0,
    onComplete,
  }: {
    immediate?: boolean;
    offset?: number;
    onComplete?: () => void;
  } = {},
): void {
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

  useLayoutEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;

    if (window.location.hash) return;

    const lenis = lenisRef.current;
    if (lenis) {
      lenis.stop();
      lenis.scrollTo(0, { immediate: true, force: true });
      lenis.start();
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    requestAnimationFrame(() => lenisRef.current?.resize());
  }, [pathname]);

  return null;
}
