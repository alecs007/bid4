"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

/** U+200B zero-width space and U+00A0 no-break space, named so they are
    visible in the source rather than being invisible literals. */
const ZERO_WIDTH = "​";
const NBSP = " ";

/**
 * Every character — digit or not — sits in a box exactly one line tall, so the
 * rolling digits, the thousands separator and the " lei" suffix all share one
 * baseline. Nothing here relies on inline baseline alignment, which is what
 * made an odometer built out of `align-bottom` spans sit too high.
 */
const SLOT = "block h-[1lh] leading-[1lh]";

/** One extra pass through 0–9 before the digit settles: it reads as a spin. */
const SPINS = 1;
/**
 * Where the counter rests before it rolls: the smallest number of the same
 * width — 1.000 for a four-digit sum, 100.000 for a six-digit one. Leading
 * zeros would read as a broken number rather than as a counter about to run.
 */
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
  // Always forward: from `startDigit` on the first pass to `digit` on the
  // second, so every slot travels between one and nineteen steps.
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

/**
 * One rendering of one formatted string. Mounted fresh whenever the string
 * changes — which is how the digits start at the resting number and roll up
 * rather than animating backwards.
 *
 * `animate: false` paints the digits where they belong straight away, for
 * figures that should simply be read rather than counted up to.
 */
function Odometer({ text, animate }: { text: string; animate: boolean }) {
  const [rolling, setRolling] = useState(!animate);

  useEffect(() => {
    if (!animate) return;
    // Two frames: the first paints the strip at zero, the second starts the
    // transition. One frame is not enough — the browser would coalesce both
    // styles into a single computation and skip the animation entirely.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setRolling(true));
    });
    // A hidden or background tab never runs those frames, and a number frozen
    // at its resting value would be plainly wrong. The timer settles it either
    // way.
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
      {/* Zero-width anchor: gives the flex row a real first-line baseline so
          the odometer aligns with the sentence around it. */}
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
              {/* A plain space would collapse inside a flex row — the reason
                  the " lei" suffix used to sit flush against the number. */}
              {character === " " ? NBSP : character}
            </span>
          );
        }

        // Digits further right settle later, the way a mechanical counter does.
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

/**
 * Odometer for impact numbers: digits roll up into place, the separators and
 * the currency suffix stay put.
 *
 * Mount it only once the real figure is known. Every digit of that figure is
 * rendered from the first frame — resting at 1.000 (or 100.000, or whatever
 * the smallest number of that width is) before it rolls — so the number
 * occupies its final width immediately and the text around it never reflows.
 *
 * With `animateOnMount={false}` the first figure is shown as-is and only later
 * changes roll: right for small counts that are read, not watched.
 */
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

  // State initialised once and never set: it holds the string this component
  // mounted with, so anything after that counts as a change.
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
