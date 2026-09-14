"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const SHOW_AFTER_MS = 160;
const SAFETY_MS = 8000;
const FINISH_MS = 260;

type Phase = "idle" | "loading" | "done";

export function RouteProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");

  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<number[]>([]);

  const set = useCallback((next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const start = useCallback(() => {
    clearTimers();
    timers.current.push(
      window.setTimeout(() => set("loading"), SHOW_AFTER_MS),
      window.setTimeout(() => set("idle"), SAFETY_MS),
    );
  }, [clearTimers, set]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname) return;

      start();
    };

    document.addEventListener("click", onClick, { capture: true });
    window.addEventListener("popstate", start);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", start);
      clearTimers();
    };
  }, [clearTimers, start]);

  const landed = useRef(false);
  useEffect(() => {
    if (!landed.current) {
      landed.current = true;
      return;
    }

    clearTimers();
    if (phaseRef.current !== "loading") {
      set("idle");
      return;
    }

    set("done");
    timers.current.push(window.setTimeout(() => set("idle"), FINISH_MS));
  }, [pathname, clearTimers, set]);

  if (phase === "idle") return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5"
    >
      <Bar done={phase === "done"} />
    </div>
  );
}

function Bar({ done }: { done: boolean }) {
  const [grown, setGrown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className="h-full origin-left rounded-r-full bg-primary-500 motion-reduce:transition-none"
      style={{
        transform: `scaleX(${done ? 1 : grown ? 0.9 : 0.03})`,
        opacity: done ? 0 : 1,
        transitionProperty: "transform, opacity",
        transitionDuration: done ? "200ms, 220ms" : "6000ms, 150ms",
        transitionTimingFunction: done
          ? "ease-out"
          : "cubic-bezier(0.05, 0.7, 0.1, 1)",
      }}
    />
  );
}
