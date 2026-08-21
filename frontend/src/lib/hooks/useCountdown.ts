"use client";

import { useEffect, useRef, useState } from "react";

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Whole seconds left; 0 once the deadline passed. */
  totalSeconds: number;
  isOver: boolean;
}

export function diffToParts(
  target: Date | string,
  from = Date.now(),
): CountdownParts {
  const targetMs =
    typeof target === "string" ? Date.parse(target) : target.getTime();
  const totalSeconds = Math.max(0, Math.floor((targetMs - from) / 1000));

  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalSeconds,
    isOver: totalSeconds <= 0,
  };
}

/**
 * Per-second countdown to an ISO instant.
 *
 * Ticks on a 1s interval and recomputes from `Date.now()` every time rather
 * than decrementing, so a backgrounded tab or a sleeping laptop cannot drift.
 *
 * TODO(backend): the server is the clock of record. When the WebSocket channel
 * lands, reconcile against the `serverTime` it pushes with every auction event.
 */
export function useCountdown(
  target: string,
  options: { onEnd?: () => void; enabled?: boolean } = {},
): CountdownParts {
  const { onEnd, enabled = true } = options;

  const [parts, setParts] = useState<CountdownParts>(() => diffToParts(target));
  const firedRef = useRef(false);

  // Kept in a ref so a new inline `onEnd` closure does not restart the timer.
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    firedRef.current = false;
    if (!enabled) return;

    const tick = () => {
      const next = diffToParts(target);
      setParts(next);
      if (next.isOver && !firedRef.current) {
        firedRef.current = true;
        onEndRef.current?.();
      }
    };

    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [target, enabled]);

  return parts;
}
