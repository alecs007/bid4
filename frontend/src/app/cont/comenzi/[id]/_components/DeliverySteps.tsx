import { Icons } from "@/components/icons";
import { journeyOf, type Stage } from "@/lib/orders/journey";
import type { Order } from "@/lib/types";
import { cn } from "@/lib/utils/cn";
import { formatDateTimeRo } from "@/lib/utils/date";

export function DeliverySteps({ order }: { order: Order }) {
  const stages = journeyOf(order);

  return (
    <ol className="flex flex-col">
      {stages.map((stage, index) => (
        <Step
          key={stage.key}
          stage={stage}
          last={index === stages.length - 1}
        />
      ))}
    </ol>
  );
}

function Step({ stage, last }: { stage: Stage; last: boolean }) {
  const done = stage.state === "done";
  const active = stage.state === "active";
  const stopped = stage.state === "stopped";

  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center self-stretch">
        <span
          aria-hidden="true"
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full ring-1 transition",
            done && "bg-primary-600 text-white ring-primary-600",
            active && "bg-white text-sky-700 ring-2 ring-sky-500",
            stopped && "bg-danger-50 text-danger-600 ring-danger-200",
            stage.state === "pending" && "bg-white text-ink-400 ring-edge",
          )}
        >
          {done ? (
            <Icons.check className="h-3.5 w-3.5" />
          ) : stopped ? (
            <Icons.close className="h-3.5 w-3.5" />
          ) : (
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                active ? "bg-sky-600" : "bg-ink-200",
              )}
            />
          )}
        </span>

        {!last ? (
          <span
            aria-hidden="true"
            className={cn(
              "my-1.5 w-0.5 flex-1 rounded-full",
              done ? "bg-primary-200" : "bg-line",
            )}
          />
        ) : null}
      </div>

      <div
        className={cn(
          "min-h-6 min-w-0 flex-1 pt-px",
          last ? "pb-0" : "pb-5",
        )}
      >
        <p
          className={cn(
            "font-display text-[14px] leading-tight font-extrabold",
            active ? "text-ink-900" : stopped ? "text-danger-700" : done ? "text-ink-800" : "text-ink-500",
          )}
        >
          {stage.label}
        </p>
        {stage.at ? (
          <p className="numeric mt-0.5 text-[12px] text-ink-500">
            {formatDateTimeRo(stage.at)}
          </p>
        ) : null}
        {stage.note ? (
          <p className="mt-0.5 text-[13px] leading-snug text-ink-600">
            {stage.note}
          </p>
        ) : null}
      </div>
    </li>
  );
}
