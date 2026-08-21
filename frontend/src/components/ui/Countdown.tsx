"use client";

import { useEffect, useState } from "react";

import { Icons } from "@/components/icons";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { cn } from "@/lib/utils/cn";

type Urgency = "calm" | "soon" | "urgent";

function urgencyOf(totalSeconds: number): Urgency {
  if (totalSeconds <= 3600) return "urgent"; // last hour
  if (totalSeconds <= 86_400) return "soon"; // last day
  return "calm";
}

const NUMBER_TONE: Record<Urgency, string> = {
  calm: "text-ink-900",
  soon: "text-sun-800",
  urgent: "text-accent-700",
};

const LABEL_TONE: Record<Urgency, string> = {
  calm: "text-ink-500",
  soon: "text-sun-700",
  urgent: "text-accent-700",
};

const BAR_TONE: Record<Urgency, string> = {
  calm: "bg-primary-500",
  soon: "bg-sun-400",
  urgent: "bg-accent-500",
};

const pad = (value: number) => String(value).padStart(2, "0");

interface Segment {
  value: number;
  /** Short unit shown next to the number. */
  short: string;
  /** Full word, for the accessible label. */
  long: string;
}

export interface CountdownProps {
  /** ISO instant the auction closes. */
  endTime: string;
  /** Needed only when `showProgress` is on. */
  startTime?: string;
  size?: "lg" | "md" | "sm";
  /** Prefix copy. Hidden at size "sm". */
  label?: string;
  endedLabel?: string;
  onEnd?: () => void;
  /** Thin bar showing how much of the auction window is left. */
  showProgress?: boolean;
  /** Bump when anti-sniping pushes `endTime` out; the timer flashes. */
  extensionCount?: number;
  className?: string;
}

/**
 * Live per-second countdown.
 *
 * One continuous line of numerals with quiet unit letters, rather than digits
 * boxed up one per unit: it reads as a single quantity of time, keeps its
 * rhythm as units drop away, and sits comfortably inside a card.
 *
 * Server and client render at different instants, so each numeral carries
 * `suppressHydrationWarning`; the first client tick reconciles them.
 */
export function Countdown({
  endTime,
  startTime,
  size = "md",
  label = "Se termină în",
  endedLabel = "Licitație încheiată",
  onEnd,
  showProgress = false,
  extensionCount = 0,
  className,
}: CountdownProps) {
  const { days, hours, minutes, seconds, totalSeconds, isOver } = useCountdown(
    endTime,
    { onEnd },
  );
  const urgency = urgencyOf(totalSeconds);

  /**
   * `flash` is derived: state only records which extension we finished
   * celebrating, and it is written from a timer callback, never synchronously
   * inside the effect.
   */
  const [celebrated, setCelebrated] = useState(extensionCount);
  const flash = celebrated !== extensionCount;

  useEffect(() => {
    if (!flash) return;
    const timeout = window.setTimeout(() => setCelebrated(extensionCount), 2400);
    return () => window.clearTimeout(timeout);
  }, [flash, extensionCount]);

  if (isOver) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-ink-200 bg-ink-50 px-2 py-1 text-xs font-bold text-ink-600",
          className,
        )}
      >
        <Icons.clock aria-hidden="true" className="h-3.5 w-3.5" />
        {endedLabel}
      </span>
    );
  }

  /* Show at most three units: days drop the seconds, hours drop the days. */
  const segments: Segment[] =
    days > 0
      ? [
          { value: days, short: "z", long: "zile" },
          { value: hours, short: "h", long: "ore" },
          { value: minutes, short: "m", long: "minute" },
        ]
      : hours > 0
        ? [
            { value: hours, short: "h", long: "ore" },
            { value: minutes, short: "m", long: "minute" },
            { value: seconds, short: "s", long: "secunde" },
          ]
        : [
            { value: minutes, short: "m", long: "minute" },
            { value: seconds, short: "s", long: "secunde" },
          ];

  const spoken = segments
    .map((segment) => `${segment.value} ${segment.long}`)
    .join(", ");

  const numberSize = {
    lg: "text-4xl",
    md: "text-2xl",
    sm: "text-lg",
  } as const;
  const unitSize = {
    lg: "text-base",
    md: "text-sm",
    sm: "text-xs",
  } as const;

  /**
   * How much of the auction window is left, derived from the ticking value
   * rather than from a fresh clock read: the bar then updates with the digits,
   * and render stays pure.
   */
  const remainingPercent = (() => {
    if (!startTime) return 0;
    const windowSeconds =
      (Date.parse(endTime) - Date.parse(startTime)) / 1000;
    if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) return 0;
    return Math.min(100, Math.max(0, (totalSeconds / windowSeconds) * 100));
  })();

  const Glyph = urgency === "urgent" ? Icons.urgent : Icons.clock;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {size !== "sm" ? (
        <div className="flex items-center gap-1.5">
          <Glyph
            aria-hidden="true"
            className={cn("h-3.5 w-3.5", LABEL_TONE[urgency])}
          />
          <span className={cn("text-xs font-bold", LABEL_TONE[urgency])}>
            {flash ? "Timp prelungit!" : label}
          </span>
        </div>
      ) : null}

      <div
        role="timer"
        // The label names a moving quantity, so it mismatches on hydration
        // exactly like the digits do.
        suppressHydrationWarning
        aria-label={`${label}: ${spoken}`}
        className={cn(
          "flex items-baseline gap-2.5",
          flash && "animate-pop-in",
          NUMBER_TONE[urgency],
        )}
      >
        {segments.map((segment) => (
          <span key={segment.short} className="inline-flex items-baseline">
            <span
              suppressHydrationWarning
              className={cn(
                "numeric font-display leading-none font-extrabold",
                numberSize[size],
              )}
            >
              {pad(segment.value)}
            </span>
            <span
              className={cn(
                "ml-0.5 font-display leading-none font-bold opacity-45",
                unitSize[size],
              )}
            >
              {segment.short}
            </span>
          </span>
        ))}
      </div>

      {showProgress && startTime ? (
        <div
          className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-100"
          aria-hidden="true"
        >
          <div
            // The width is time-derived; same hydration story as the digits.
            suppressHydrationWarning
            className={cn(
              "h-full rounded-full transition-[width] duration-1000 ease-linear",
              BAR_TONE[urgency],
            )}
            style={{ width: `${remainingPercent.toFixed(2)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

/**
 * One-line variant for cards and table rows: an icon, then the two largest
 * units. Never wraps, never shifts width as the seconds tick.
 */
export function CountdownInline({
  endTime,
  onEnd,
  className,
}: {
  endTime: string;
  onEnd?: () => void;
  className?: string;
}) {
  const { days, hours, minutes, seconds, totalSeconds, isOver } = useCountdown(
    endTime,
    { onEnd },
  );
  const urgency = urgencyOf(totalSeconds);
  const Glyph = urgency === "urgent" ? Icons.urgent : Icons.clock;

  if (isOver) {
    return (
      <span className={cn("text-xs font-bold text-ink-500", className)}>
        Încheiată
      </span>
    );
  }

  const text =
    days > 0
      ? `${days}z ${pad(hours)}h`
      : hours > 0
        ? `${hours}h ${pad(minutes)}m`
        : `${pad(minutes)}:${pad(seconds)}`;

  return (
    <span
      suppressHydrationWarning
      className={cn(
        "numeric inline-flex items-center gap-1.5 text-sm font-extrabold",
        NUMBER_TONE[urgency],
        className,
      )}
    >
      <Glyph aria-hidden="true" className="h-3.5 w-3.5 opacity-70" />
      {text}
    </span>
  );
}
