"use client";

import { useEffect, useState } from "react";

import { Icons } from "@/components/icons";
import { useCountdown } from "@/lib/hooks/useCountdown";
import { cn } from "@/lib/utils/cn";

type Urgency = "calm" | "soon" | "urgent";

function urgencyOf(totalSeconds: number): Urgency {
  if (totalSeconds <= 3600) return "urgent";
  if (totalSeconds <= 86_400) return "soon";
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
  short: string;
  long: string;
}

export interface CountdownProps {
  endTime: string;
  startTime?: string;
  size?: "lg" | "md" | "sm";
  label?: string;
  endedLabel?: string;
  onEnd?: () => void;
  showProgress?: boolean;
  extensionCount?: number;
  className?: string;
}

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
          "inline-flex items-center gap-1 rounded-md bg-ink-50 px-2 py-1 text-xs font-bold text-ink-600",
          className,
        )}
      >
        <Icons.clock aria-hidden="true" className="h-3.5 w-3.5" />
        {endedLabel}
      </span>
    );
  }

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
        <div className="flex items-center gap-1">
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
        "numeric inline-flex items-center gap-1 text-sm font-extrabold",
        NUMBER_TONE[urgency],
        className,
      )}
    >
      <Glyph aria-hidden="true" className="h-3.5 w-3.5 opacity-70" />
      {text}
    </span>
  );
}

export function CountdownBoard({
  endTime,
  startTime,
  extensionCount = 0,
  className,
}: {
  endTime: string;
  startTime?: string;
  extensionCount?: number;
  className?: string;
}) {
  const { days, hours, minutes, seconds, totalSeconds, isOver } = useCountdown(
    endTime,
    {},
  );
  const urgency = urgencyOf(totalSeconds);

  const remainingPercent = (() => {
    if (!startTime) return 0;
    const windowSeconds = (Date.parse(endTime) - Date.parse(startTime)) / 1000;
    if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) return 0;
    return Math.min(100, Math.max(0, (totalSeconds / windowSeconds) * 100));
  })();

  if (isOver) return null;

  const cells: { value: number; label: string }[] = [
    { value: days, label: "zile" },
    { value: hours, label: "ore" },
    { value: minutes, label: "min" },
    { value: seconds, label: "sec" },
  ];

  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      <div
        role="timer"
        suppressHydrationWarning
        aria-label={`Timp rămas: ${days} zile, ${hours} ore, ${minutes} minute`}
        className="grid grid-cols-4 divide-x divide-line"
      >
        {cells.map((cell) => (
          <div key={cell.label} className="px-1 text-center">
            <p
              suppressHydrationWarning
              className={cn(
                "numeric font-display text-2xl leading-none font-extrabold",
                NUMBER_TONE[urgency],
              )}
            >
              {pad(cell.value)}
            </p>
            <p className="mt-1 text-[11px] text-ink-500">{cell.label}</p>
          </div>
        ))}
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          suppressHydrationWarning
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-linear",
            BAR_TONE[urgency],
          )}
          style={{ width: `${remainingPercent.toFixed(2)}%` }}
        />
      </div>

      {extensionCount > 0 ? (
        <p className="text-xs font-bold text-sun-700">
          Prelungită de {extensionCount} ori
        </p>
      ) : null}
    </div>
  );
}

export function CountdownBar({
  endTime,
  startTime,
  className,
}: {
  endTime: string;
  startTime?: string;
  className?: string;
}) {
  const { days, hours, minutes, seconds, totalSeconds, isOver } = useCountdown(
    endTime,
    {},
  );
  const urgency = urgencyOf(totalSeconds);

  const remainingPercent = (() => {
    if (!startTime) return 0;
    const windowSeconds = (Date.parse(endTime) - Date.parse(startTime)) / 1000;
    if (!Number.isFinite(windowSeconds) || windowSeconds <= 0) return 0;
    return Math.min(100, Math.max(0, (totalSeconds / windowSeconds) * 100));
  })();

  if (isOver) return null;

  const left =
    days > 0
      ? `${days}z ${hours}h ${pad(minutes)}m`
      : hours > 0
        ? `${hours}h ${pad(minutes)}m ${pad(seconds)}s`
        : `${pad(minutes)}m ${pad(seconds)}s`;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p
        suppressHydrationWarning
        className={cn("text-center text-xs font-bold", LABEL_TONE[urgency])}
      >
        Se închide în <span className="numeric">{left}</span>
      </p>
      <div className="h-1 w-full overflow-hidden rounded-full bg-ink-100">
        <div
          suppressHydrationWarning
          className={cn(
            "h-full rounded-full transition-[width] duration-1000 ease-linear",
            BAR_TONE[urgency],
          )}
          style={{ width: `${remainingPercent.toFixed(2)}%` }}
        />
      </div>
    </div>
  );
}
