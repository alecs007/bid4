import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/labels";
import { IconBubble } from "./Card";

/**
 * Impact numbers. Used on the homepage, the dashboards and the admin overview.
 * Values are always pre-formatted by the caller (money via lib/money).
 */
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
        "flex items-start gap-3 rounded-3xl border border-ink-200 bg-white p-5",
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

/** Borderless variant for hero bands where the background already carries tone. */
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
