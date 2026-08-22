import type { ReactNode } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import type { StatusMeta, Tone } from "@/lib/labels";

const SOFT: Record<Tone, string> = {
  primary: "bg-primary-50 text-primary-900 border-primary-200",
  accent: "bg-accent-50 text-accent-900 border-accent-200",
  sky: "bg-sky-50 text-sky-900 border-sky-200",
  sun: "bg-sun-50 text-sun-900 border-sun-200",
  success: "bg-success-50 text-success-700 border-success-100",
  warning: "bg-warning-50 text-warning-700 border-warning-100",
  danger: "bg-danger-50 text-danger-700 border-danger-100",
  neutral: "bg-ink-50 text-ink-700 border-line",
};

const SOLID: Record<Tone, string> = {
  primary: "bg-primary-600 text-white border-primary-700",
  accent: "bg-accent-600 text-white border-accent-700",
  sky: "bg-sky-600 text-white border-sky-700",
  sun: "bg-sun-400 text-ink-900 border-sun-500",
  success: "bg-success-600 text-white border-success-700",
  warning: "bg-warning-600 text-white border-warning-700",
  danger: "bg-danger-600 text-white border-danger-700",
  neutral: "bg-ink-700 text-white border-ink-800",
};

const MARKER: Record<Tone, string> = {
  primary: "bg-primary-500",
  accent: "bg-accent-500",
  sky: "bg-sky-500",
  sun: "bg-sun-500",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  neutral: "bg-ink-400",
};

export interface BadgeProps {
  tone?: Tone;
  variant?: "soft" | "solid";
  size?: "sm" | "md";
  marker?: boolean;
  pulse?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}

export function Badge({
  tone = "neutral",
  variant = "soft",
  size = "md",
  marker = false,
  pulse = false,
  icon,
  children,
  className,
  title,
}: BadgeProps) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center rounded-md border font-bold whitespace-nowrap",
        size === "sm"
          ? "gap-1.5 px-1.5 py-0.5 text-[11px] leading-5"
          : "gap-2 px-2 py-1 text-xs leading-5",
        variant === "soft" ? SOFT[tone] : SOLID[tone],
        className,
      )}
    >
      {icon ? (
        <span className="shrink-0 text-[1.1em] opacity-80" aria-hidden="true">
          {icon}
        </span>
      ) : marker ? (
        <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden="true">
          {pulse ? (
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-[2px] opacity-75",
                variant === "solid" ? "bg-current" : MARKER[tone],
              )}
            />
          ) : null}
          <span
            className={cn(
              "relative inline-flex h-1.5 w-1.5 rounded-[2px]",
              variant === "solid" ? "bg-current" : MARKER[tone],
            )}
          />
        </span>
      ) : null}
      {children}
    </span>
  );
}

export function StatusBadge({
  meta,
  variant,
  size,
  marker = true,
  pulse,
  icon,
  className,
}: { meta: StatusMeta } & Omit<BadgeProps, "children" | "tone">) {
  return (
    <Badge
      tone={meta.tone}
      variant={variant}
      size={size}
      marker={marker}
      pulse={pulse}
      icon={icon}
      title={meta.hint}
      className={className}
    >
      {meta.label}
    </Badge>
  );
}

export function DonationBadge({
  percent,
  size = "md",
  className,
}: {
  percent: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const tone: Tone = percent >= 75 ? "accent" : "primary";
  const full = percent === 100;

  return (
    <span
      title={`${percent}% din prețul final merge către cauză`}
      className={cn(
        "inline-flex items-center rounded-md border font-bold whitespace-nowrap",
        size === "sm" ? "gap-1 px-1.5 py-0.5 text-[11px]" : "gap-1.5 px-2 py-1 text-xs",
        full ? SOLID[tone] : SOFT[tone],
        className,
      )}
    >
      <Icons.donation
        aria-hidden="true"
        className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"}
      />
      <span
        className={cn(
          "font-display font-extrabold",
          size === "sm" ? "text-xs" : "text-[13px]",
        )}
      >
        {percent}%
      </span>
      <span className="font-semibold opacity-80">pentru cauză</span>
    </span>
  );
}

export function MetaChip({
  icon,
  children,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs font-semibold text-ink-600",
        className,
      )}
    >
      {icon ? (
        <span className="shrink-0 text-ink-400" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}
