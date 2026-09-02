import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/labels";
import { IconBubble } from "./Card";
import { Illustration } from "./Illustration";

export function Stat({
  label,
  value,
  hint,
  icon,
  tone = "primary",
  size = "md",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const valueSize = {
    sm: "text-xl",
    md: "text-3xl",
    lg: "text-4xl sm:text-5xl",
  } as const;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-3xl bg-white ring-1 ring-edge p-5",
        className,
      )}
    >
      {icon ? (
        <IconBubble tone={tone} size={size === "lg" ? "lg" : "md"}>
          {icon}
        </IconBubble>
      ) : null}
      <div className="min-w-0">
        <p
          className={cn(
            "numeric font-display leading-none font-extrabold text-ink-900",
            valueSize[size],
          )}
        >
          {value}
        </p>
        <p className="mt-1.5 text-sm font-bold text-ink-700">{label}</p>
        {hint ? <p className="mt-0.5 text-xs text-ink-500">{hint}</p> : null}
      </div>
    </div>
  );
}

/**
 * One figure in a row of three, under a drawing.
 *
 * <p>The listing page's seller panel and the public profile show the same kind of thing about the
 * same person, and were showing it two different ways: three tiles there, three full-width `Stat`
 * cards here, stacked on a phone. This is the tile, in one place, so they cannot drift again.
 *
 * <p>The drawings carry their own colour and their own soft shadow, so they sit straight on the
 * card: a tinted disc behind one is a second background under a mark that already has one, and it
 * flattens the artwork rather than lifting it.
 */
export function StatTile({
  illustration,
  value,
  label,
}: {
  /** File under `public/images/illustrations`, without the extension. */
  illustration: string;
  value: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-canvas px-2 py-4 text-center ring-1 ring-edge">
      <Illustration
        src={illustration}
        className="h-8 w-8 sm:h-10 sm:w-10"
        sizes="40px"
      />
      <div>
        <dt className="numeric font-display text-lg leading-none font-extrabold text-ink-900 sm:text-xl">
          {value}
        </dt>
        <dd className="mt-1 text-xs leading-tight text-ink-500">{label}</dd>
      </div>
    </div>
  );
}

/**
 * Three of them, which is the only shape they are used in.
 *
 * <p>Three across at every width, phones included. Stacked, they push everything below a profile
 * off the screen and read as three separate announcements rather than one summary.
 */
export function StatTiles({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-3 gap-2 sm:gap-3", className)}>
      {children}
    </dl>
  );
}

export function StatInline({
  label,
  value,
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("text-center", className)}>
      <p className="numeric font-display text-2xl leading-none font-extrabold text-ink-900 sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-sm font-bold text-ink-600">
        {label}
      </p>
    </div>
  );
}
