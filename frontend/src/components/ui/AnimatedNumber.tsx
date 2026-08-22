"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

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
  minChars = 0,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
  minChars?: number;
}) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setShown(value), 0);
    return () => window.clearTimeout(timer);
  }, [value]);

  const target = format(value);
  const rolling = format(shown).padStart(target.length, " ");

  return (
    <span
      className={cn("numeric inline-flex tabular-nums", className)}
      style={minChars ? { minWidth: `${minChars}ch` } : undefined}
    >
      <span className="sr-only">{target}</span>

      {target.split("").map((character, index) => {
        if (!/\d/.test(character)) {
          return (
            <span key={`${character}-${index}`} aria-hidden="true">
              {character === " " ? " " : character}
            </span>
          );
        }
        return (
          <DigitSlot
            key={`digit-${index}`}
            digit={Number(rolling[index]) || 0}
            delayMs={index * 40}
          />
        );
      })}
    </span>
  );
}
