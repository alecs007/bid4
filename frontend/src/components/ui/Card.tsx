import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/labels";

export interface CardProps extends ComponentPropsWithoutRef<"div"> {
  surface?: "white" | "subtle";
  interactive?: boolean;
  padded?: boolean | "sm" | "lg" | false;
  as?: ElementType;
  children?: ReactNode;
}

export function Card({
  surface = "white",
  interactive = false,
  padded = true,
  as: Component = "div",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Component
      className={cn(
        "rounded-3xl border",
        surface === "white"
          ? "border-line bg-white"
          : "border-line bg-ink-50",
        padded === true && "p-5 sm:p-6",
        padded === "sm" && "p-4",
        padded === "lg" && "p-6 sm:p-8",
        interactive && "lift cursor-pointer",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
        <div className="min-w-0">
          <h3 className="font-display text-lg font-extrabold text-ink-900">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-sm text-ink-600">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function IconBubble({
  tone = "primary",
  size = "md",
  children,
  className,
}: {
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
  className?: string;
}) {
  const tones: Record<Tone, string> = {
    primary: "bg-primary-100 text-primary-900",
    accent: "bg-accent-100 text-accent-900",
    sky: "bg-sky-100 text-sky-900",
    sun: "bg-sun-100 text-sun-900",
    success: "bg-success-100 text-success-700",
    warning: "bg-warning-100 text-warning-700",
    danger: "bg-danger-100 text-danger-700",
    neutral: "bg-ink-100 text-ink-700",
  };
  const sizes = {
    sm: "h-8 w-8 text-base",
    md: "h-11 w-11 text-xl",
    lg: "h-14 w-14 text-2xl",
  } as const;

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl",
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-sm font-bold text-ink-500", className)}>{children}</p>
  );
}
