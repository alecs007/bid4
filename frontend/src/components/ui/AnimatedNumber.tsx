"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * A number that rolls into place instead of being replaced.
 *
 * Each digit is a slot holding 0-9; changing the value slides the strip to the
 * new digit. Separators and words are rendered as-is, and the whole thing uses
 * tabular figures, so a slot is always the same width and nothing around it
 * moves while it animates.
 *
 * Used where a value arrives slightly after the page does and a skeleton would
 * be more disruptive than the number simply counting up.
 */

const DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function DigitSlot({ digit, delayMs }: { digit: number; delayMs: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-[1em] overflow-hidden align-bottom"
    >
      <span
        className="flex flex-col transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.7,0.3,1)] motion-reduce:transition-none"
        style={{
          transform: `translateY(-${digit * 10}%)`,
          transitionDelay: `${delayMs}ms`,
        }}
      >
        {DIGITS.map((value) => (
          <span key={value} className="h-[1em] leading-[1em]">
            {value}
          </span>
        ))}
      </span>
    </span>
  );
}

export function AnimatedNumber({
  value,
  format,
  className,
  /** Reserves horizontal space so the text after it never jumps. */
  minChars = 0,
}: {
  value: number;
  /** Turns the raw value into its display string, e.g. money formatting. */
  format: (value: number) => string;
  className?: string;
  minChars?: number;
}) {
  /**
   * Renders at zero for a tick, then rolls to the real value. A timer rather
   * than requestAnimationFrame: rAF is paused while a tab is not compositing,
   * which would leave the digits stuck at zero rather than merely unanimated.
   * The state change sits inside the callback, so the effect stays free of a
   * synchronous cascade.
   */
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(value), 0);
    return () => window.clearTimeout(timer);
  }, [value]);

  // The slot layout follows the target string, so the width is stable from the
  // first paint even while the digits are still rolling.
  const target = format(value);
  const rolling = format(shown).padStart(target.length, " ");

  return (
    <span
      className={cn("numeric inline-flex tabular-nums", className)}
      style={minChars ? { minWidth: `${minChars}ch` } : undefined}
    >
      {/* The plain string carries the value for assistive tech. */}
      <span className="sr-only">{target}</span>

      {target.split("").map((character, index) => {
        if (!/\d/.test(character)) {
          return (
            <span key={`${character}-${index}`} aria-hidden="true">
              {character === " " ? " " : character}
            </span>
          );
        }
        const current = Number(rolling[index]) || 0;
        // Stagger by position, so the number settles left to right.
        return (
          <DigitSlot
            key={`digit-${index}`}
            digit={current}
            delayMs={index * 40}
          />
        );
      })}
    </span>
  );
}
