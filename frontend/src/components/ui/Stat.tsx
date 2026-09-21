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

export function StatTile({
  illustration,
  value,
  label,
}: {
  illustration: string;
  value: ReactNode;
  label: ReactNode;
}) {
  return (
    <div className="@container flex min-w-0 flex-col items-center gap-2 rounded-2xl bg-canvas px-1.5 py-4 text-center ring-1 ring-edge sm:px-3">
      <Illustration
        src={illustration}
        className="h-8 w-8 shrink-0 sm:h-10 sm:w-10"
        sizes="40px"
      />
      <div className="w-full min-w-0">
        <dt className="numeric font-display text-[clamp(0.875rem,18cqw,1.375rem)] leading-tight font-extrabold whitespace-nowrap text-ink-900">
          {value}
        </dt>
        <dd className="mt-0.5 text-[clamp(0.625rem,12cqw,0.75rem)] leading-tight whitespace-nowrap text-ink-500">
          {label}
        </dd>
      </div>
    </div>
  );
}

export function StatTiles({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl className={cn("grid grid-cols-3 gap-1.5 sm:gap-3", className)}>
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
      <p className="mt-1 text-sm font-bold text-ink-600">{label}</p>
    </div>
  );
}
