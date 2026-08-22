import type { ReactNode } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/labels";

const CHIP_SOFT: Record<Tone, string> = {
  primary: "bg-primary-100 text-primary-900",
  accent: "bg-accent-100 text-accent-900",
  sky: "bg-sky-100 text-sky-900",
  sun: "bg-sun-100 text-sun-900",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-700",
  neutral: "bg-ink-100 text-ink-700",
};

const CHIP_SOLID: Record<Tone, string> = {
  primary: "bg-primary-600 text-white",
  accent: "bg-accent-600 text-white",
  sky: "bg-sky-600 text-white",
  sun: "bg-sun-400 text-ink-900",
  success: "bg-success-600 text-white",
  warning: "bg-warning-600 text-white",
  danger: "bg-danger-600 text-white",
  neutral: "bg-ink-700 text-white",
};

const DEFAULT_ICONS: Record<Tone, ReactNode> = {
  primary: <Icons.escrow aria-hidden="true" className="h-4 w-4" />,
  accent: <Icons.impact aria-hidden="true" className="h-4 w-4" />,
  sky: <Icons.info aria-hidden="true" className="h-4 w-4" />,
  sun: <Icons.warning aria-hidden="true" className="h-4 w-4" />,
  success: <Icons.success aria-hidden="true" className="h-4 w-4" />,
  warning: <Icons.warning aria-hidden="true" className="h-4 w-4" />,
  danger: <Icons.error aria-hidden="true" className="h-4 w-4" />,
  neutral: <Icons.info aria-hidden="true" className="h-4 w-4" />,
};

export function Alert({
  tone = "sky",
  title,
  icon,
  action,
  children,
  className,
}: {
  tone?: Tone;
  title?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const loud = tone === "danger" || tone === "warning" || tone === "sun";

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-2xl bg-white ring-1 ring-edge p-4",
        className,
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          loud ? CHIP_SOLID[tone] : CHIP_SOFT[tone],
        )}
      >
        {icon ?? DEFAULT_ICONS[tone]}
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="font-display font-bold text-ink-900">{title}</p>
        ) : null}
        {children ? (
          <div className="text-sm leading-relaxed text-ink-600">{children}</div>
        ) : null}
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
