import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/labels";
import { formatMoney, progressPercent } from "@/lib/money";
import type { Bani } from "@/lib/config";

const FILLS: Record<Tone, string> = {
  primary: "bg-primary-500",
  accent: "bg-accent-500",
  sky: "bg-sky-500",
  sun: "bg-sun-400",
  success: "bg-success-500",
  warning: "bg-warning-500",
  danger: "bg-danger-500",
  neutral: "bg-ink-400",
};

export function ProgressBar({
  value,
  tone = "primary",
  size = "md",
  label,
  className,
}: {
  value: number;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const safe = Math.min(100, Math.max(0, value));
  const heights = { sm: "h-2", md: "h-3", lg: "h-5" } as const;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(safe)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        "w-full overflow-hidden rounded-full bg-ink-100",
        heights[size],
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-out",
          FILLS[tone],
        )}
        style={{ width: `${safe}%` }}
      />
    </div>
  );
}

export function GoalProgress({
  raised,
  goal,
  tone = "primary",
  compact = false,
  className,
}: {
  raised: Bani;
  goal: Bani;
  tone?: Tone;
  compact?: boolean;
  className?: string;
}) {
  const percent = progressPercent(raised, goal);
  const reached = raised >= goal && goal > 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-1.5 flex items-end justify-between gap-3">
        <div>
          <span
            className={cn(
              "numeric font-display font-extrabold text-ink-900",
              compact ? "text-lg" : "text-2xl",
            )}
          >
            {formatMoney(raised, { compact: true })}
          </span>
          <span className="ml-1.5 text-sm text-ink-600">
            din {formatMoney(goal, { compact: true })}
          </span>
        </div>
        <span
          className={cn(
            "numeric shrink-0 font-display font-extrabold",
            reached ? "text-success-600" : "text-primary-700",
            compact ? "text-sm" : "text-base",
          )}
        >
          {Math.round(percent)}%
        </span>
      </div>
      <ProgressBar
        value={percent}
        tone={reached ? "success" : tone}
        size={compact ? "sm" : "md"}
        label={`Strâns ${formatMoney(raised)} din obiectivul de ${formatMoney(goal)}`}
      />
      {reached && !compact ? (
        <p className="mt-2 text-sm font-bold text-success-600">
          🎉 Obiectiv atins! Mulțumim tuturor celor care au licitat.
        </p>
      ) : null}
    </div>
  );
}
