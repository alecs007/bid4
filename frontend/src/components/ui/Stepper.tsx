"use client";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

import { ProgressBar } from "./Progress";

export interface StepperStep {
  id: string;
  label: string;
}

/** Steps ahead are not links: a form you have not filled in is not a place you can go. */
export function Stepper({
  steps,
  current,
  furthest,
  onJump,
  className,
}: {
  steps: StepperStep[];
  /** Zero-based index of the step on screen. */
  current: number;
  /** Zero-based index of the furthest step reached, for jumping back. */
  furthest: number;
  onJump?: (index: number) => void;
  className?: string;
}) {
  const percent = ((current + 1) / steps.length) * 100;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-sm font-extrabold text-ink-700">
          Pasul {current + 1} din {steps.length}
        </p>
        <p className="numeric text-xs font-bold text-ink-500">
          {Math.round(percent)}%
        </p>
      </div>

      <ProgressBar
        value={percent}
        size="md"
        label={`Pasul ${current + 1} din ${steps.length}: ${steps[current]?.label ?? ""}`}
      />

      <ol className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {steps.map((step, index) => {
          const done = index < furthest || (index < current && index <= furthest);
          const active = index === current;
          const reachable = index <= furthest && !active;

          return (
            <li key={step.id} className="shrink-0">
              <button
                type="button"
                disabled={!reachable}
                aria-current={active ? "step" : undefined}
                onClick={() => onJump?.(index)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition",
                  active && "bg-primary-100 text-primary-900",
                  !active && reachable && "text-ink-600 hover:bg-ink-100",
                  !active && !reachable && "cursor-default text-ink-400",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-lg text-[11px]",
                    active && "bg-primary-600 text-white",
                    !active && done && "bg-primary-100 text-primary-800",
                    !active && !done && "bg-ink-100 text-ink-500",
                  )}
                >
                  {done && !active ? (
                    <Icons.check aria-hidden="true" className="h-3 w-3" />
                  ) : (
                    index + 1
                  )}
                </span>
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
