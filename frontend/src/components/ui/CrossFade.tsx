"use client";

import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

const OVERLAP_MS = 480;

export function CrossFade({
  ready,
  placeholder,
  children,
  className,
}: {
  ready: boolean;
  placeholder: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [held, setHeld] = useState(!ready);

  useEffect(() => {
    if (!ready || !held) return;
    const timer = window.setTimeout(() => setHeld(false), OVERLAP_MS);
    return () => window.clearTimeout(timer);
  }, [ready, held]);

  const showing = !ready || held;

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "transition-opacity duration-[450ms] ease-[var(--ease-out-soft)]",
          ready ? "opacity-100" : "opacity-0",
        )}
      >
        {children}
      </div>

      {showing ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 transition-opacity duration-[450ms] ease-[var(--ease-out-soft)]",
            ready ? "opacity-0" : "opacity-100",
          )}
        >
          {placeholder}
        </div>
      ) : null}
    </div>
  );
}

const STAGGER_MS = 45;

const STAGGER_CAP = 8;

export function rowDelay(index: number): { animationDelay: string } {
  return { animationDelay: `${Math.min(index, STAGGER_CAP) * STAGGER_MS}ms` };
}

export function tailDelay(
  index: number,
  count: number,
  offset = 0,
): { animationDelay: string } {
  const fromEnd = count - 1 - index;
  const steps = Math.max(0, Math.min(count, STAGGER_CAP) - fromEnd);
  return { animationDelay: `${offset + steps * STAGGER_MS}ms` };
}
