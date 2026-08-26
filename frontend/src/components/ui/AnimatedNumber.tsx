"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

/** Zero-width space and no-break space, named so they are not invisible literals. */
const ZERO_WIDTH = "​";
const NBSP = " ";

// Inline baseline alignment sat the odometer too high, so every character gets a
// box exactly one line tall instead.
const SLOT = "block h-[1lh] leading-[1lh]";

/** One extra pass through 0–9 before the digit settles: it reads as a spin. */
const SPINS = 1;
/** Rests at the smallest number of the same width: leading zeros read as broken. */
const START_LEADING_DIGIT = 1;
const START_DIGIT = 0;
const STRIP = Array.from({ length: (SPINS + 1) * 10 }, (_, index) => index % 10);

const BASE_DURATION_MS = 760;
const PER_DIGIT_DURATION_MS = 130;
const MAX_DURATION_MS = 1500;
const PER_DIGIT_DELAY_MS = 40;
/** Backstop for when requestAnimationFrame is not running (hidden tab). */
const FALLBACK_MS = 120;

function DigitSlot({
  digit,
  startDigit,
  settled,
  animated,
  durationMs,
  delayMs,
}: {
  digit: number;
  startDigit: number;
  settled: boolean;
  animated: boolean;
  durationMs: number;
  delayMs: number;
}) {
  // Always forward: one to nineteen steps per slot.
  const offset = settled ? SPINS * 10 + digit : startDigit;

  return (
    <span aria-hidden="true" className={cn(SLOT, "overflow-hidden")}>
      <span
        className={cn(
          "flex flex-col",
          animated &&
            "transition-transform ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none",
        )}
        style={{
          transform: `translateY(calc(${-offset} * 1lh))`,
          transitionDuration: animated ? `${durationMs}ms` : undefined,
          transitionDelay: animated && delayMs ? `${delayMs}ms` : undefined,
        }}
      >
        {STRIP.map((value, index) => (
          <span key={index} className={SLOT}>
            {value}
          </span>
        ))}
      </span>
    </span>
  );
}

function Odometer({ text, animate }: { text: string; animate: boolean }) {
  const [rolling, setRolling] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    // Two frames: with one the browser coalesces both styles and skips the animation.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setRolling(true));
    });
    // A hidden tab never runs those frames; the timer settles the number either way.
    const fallback = window.setTimeout(() => setRolling(true), FALLBACK_MS);
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      window.clearTimeout(fallback);
    };
  }, [animate]);

  const characters = text.split("");
  const firstDigit = characters.findIndex((character) => /\d/.test(character));
  const lastDigit = characters.findLastIndex((character) =>
    /\d/.test(character),
  );

  return (
    <span className="inline-flex">
      {/* Zero-width anchor: gives the flex row a real first-line baseline. */}
      <span aria-hidden="true" className={SLOT}>
        {ZERO_WIDTH}
      </span>

      {characters.map((character, index) => {
        if (!/\d/.test(character)) {
          return (
            <span
              key={`${character}-${index}`}
              aria-hidden="true"
              className={SLOT}
            >
              {/* A plain space collapses inside a flex row. */}
              {character === " " ? NBSP : character}
            </span>
          );
        }

        const fromRight = lastDigit - index;
        return (
          <DigitSlot
            key={`digit-${index}`}
            digit={Number(character)}
            startDigit={
              index === firstDigit ? START_LEADING_DIGIT : START_DIGIT
            }
            settled={rolling}
            animated={animate}
            durationMs={Math.min(
              MAX_DURATION_MS,
              BASE_DURATION_MS + fromRight * PER_DIGIT_DURATION_MS,
            )}
            delayMs={index * PER_DIGIT_DELAY_MS}
          />
        );
      })}
    </span>
  );
}

/** Mount only once the real figure is known: it takes its final width on the first frame. */
export function AnimatedNumber({
  value,
  format,
  className,
  minChars = 0,
  animateOnMount = true,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
  minChars?: number;
  animateOnMount?: boolean;
}) {
  const text = format(value);

  // Set once and never updated: it holds the string this component mounted with.
  const [firstText] = useState(text);
  const animate = animateOnMount || text !== firstText;

  return (
    <span
      className={cn("numeric inline-flex", className)}
      style={minChars ? { minWidth: `${minChars}ch` } : undefined}
    >
      <span className="sr-only">{text}</span>
      <Odometer key={text} text={text} animate={animate} />
    </span>
  );
}
