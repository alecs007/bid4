import { CONDITION_LEVELS, ITEM_CONDITION_LEVEL } from "@/lib/labels";
import type { ItemCondition } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const SIZE = {
  xs: { row: "h-2.5 gap-[3px]", bar: "w-[3px]" },
  sm: { row: "h-3.5 gap-[3px]", bar: "w-1" },
  md: { row: "h-5 gap-1", bar: "w-2" },
} as const;

export function ConditionBars({
  condition,
  size = "md",
  className,
}: {
  condition: ItemCondition;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const level = ITEM_CONDITION_LEVEL[condition];
  const { row, bar } = SIZE[size];

  return (
    <span
      aria-hidden="true"
      className={cn("inline-flex shrink-0 items-center", row, className)}
    >
      {Array.from({ length: CONDITION_LEVELS }, (_, index) => (
        <span
          key={index}
          className={cn(
            "h-full rounded-full",
            bar,
            index < level ? "bg-primary-500" : "bg-ink-200",
          )}
        />
      ))}
    </span>
  );
}
