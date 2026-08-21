"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Celebratory confetti for the two moments that deserve it: winning an auction,
 * and a cause reaching its goal. CSS-only — no canvas, no dependency.
 *
 * Silent for users with `prefers-reduced-motion: reduce`.
 */
const COLORS = ["#58cc02", "#ff6b4a", "#38bdf8", "#ffc93c", "#7fda3e"];

interface Piece {
  left: number;
  delay: number;
  duration: number;
  drift: number;
  rotation: number;
  color: string;
  size: number;
  round: boolean;
}

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, index) => ({
    left: (index / count) * 100 + (Math.random() * 8 - 4),
    delay: Math.random() * 0.9,
    duration: 2.2 + Math.random() * 1.4,
    drift: Math.random() * 240 - 120,
    rotation: 360 + Math.random() * 720,
    color: COLORS[index % COLORS.length] ?? COLORS[0]!,
    size: 8 + Math.random() * 8,
    round: Math.random() > 0.6,
  }));
}

export function Confetti({
  count = 40,
  /** Re-fires whenever this value changes. */
  trigger = 0,
}: {
  count?: number;
  trigger?: number;
}) {
  /**
   * `active` is derived: state only remembers which trigger has already burned
   * out, and it is written from a timer callback rather than synchronously in
   * the effect. Reduced-motion users are handled globally in globals.css, which
   * collapses the animation to nothing.
   */
  const [spentTrigger, setSpentTrigger] = useState<number | null>(null);
  const active = spentTrigger !== trigger;
  const pieces = useMemo(() => makePieces(count), [count]);

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => setSpentTrigger(trigger), 4200);
    return () => window.clearTimeout(timeout);
  }, [active, trigger]);

  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 overflow-hidden"
    >
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="absolute top-0 animate-confetti"
          style={
            {
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.size * (piece.round ? 1 : 0.5),
              backgroundColor: piece.color,
              borderRadius: piece.round ? "9999px" : "2px",
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
              "--confetti-x": `${piece.drift}px`,
              "--confetti-r": `${piece.rotation}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
