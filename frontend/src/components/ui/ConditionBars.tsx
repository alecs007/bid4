import { CONDITION_LEVELS, ITEM_CONDITION_LEVEL } from "@/lib/labels";
import type { ItemCondition } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const SIZE = {
  /** Beside a line of small print, where it has to read as punctuation. */
  sm: { row: "h-2.5 gap-[3px]", bar: "w-[3px]" },
  /** In the picker, where choosing between two adjacent states is the whole job. */
  md: { row: "h-5 gap-1", bar: "w-2" },
} as const;

/**
 * How much of an object's life is left, as five bars rather than as a place in a list.
 *
 * <p>"Stare foarte bună" and "Stare bună" are one word apart and sit next to each other in a
 * ranking; the bars are what separate them at a glance, and they rank the list without numbering
 * it. That is as useful under a listing's title as it is in the picker that set it, so the drawing
 * lives here rather than inside either.
 *
 * <p>Hidden from readers who cannot see it, because the words are right beside it. It says nothing
 * they are not already being told.
 */
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
