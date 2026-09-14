import { cn } from "@/lib/utils/cn";

/**
 * The two sizes a count is drawn at, and nothing between them.
 *
 * <p>The line-height rides on the font-size as {@code text-[11px]/none} rather than arriving as a
 * separate {@code leading-none}. It has to: `cn` is tailwind-merge, v4 treats `text-{size}` and
 * `leading-*` as one group because of this very shorthand, and a `leading-none` written beside the
 * size was silently dropped — measured in the browser as a computed line-height of 16.5px, the
 * inherited 1.5, on a badge whose class attribute no longer contained the utility at all.
 */
const SIZES = {
  /** In the corner of a 36px header mark. */
  xs: "h-3 min-w-3 text-[9px]/none",
  /** Beside a name in a list, or on a tab. */
  sm: "h-5 min-w-5 text-[11px]/none",
} as const;

export type UnreadBadgeSize = keyof typeof SIZES;

/**
 * A count, centred in a disc.
 *
 * <p>One component for every unread count on the site, because there were three and they each
 * centred the digits differently. Two of those differences were invisible until you looked closely
 * and one was not:
 *
 * <ul>
 *   <li><b>A line-height of 1.</b> Without it the digits inherit 1.5, so an 11px number gets a
 *       16.5px line box inside a 20px disc — and flex centres the box, not the ink. It is folded
 *       into the size token; see {@link SIZES} for why it cannot be a separate class.
 *   <li><b>{@code font-sans}.</b> A badge inside anything wearing {@code font-display} rendered its
 *       digits in Baloo 2, whose descender is half an em. A descender no digit uses still counts
 *       towards where the baseline falls, so the ink ends up above centre. The tab badge sits inside
 *       a {@code font-display} link, so this was the visible one.
 *   <li><b>Equal height and min-width.</b> A disc, not a lozenge: one digit sits in a circle, and
 *       only a second or third is allowed to stretch it into a pill.
 * </ul>
 *
 * <p>None of that varies by device — it is font metrics and inherited CSS, identical everywhere —
 * which is the point of fixing it in one place rather than three.
 */
export function UnreadBadge({
  count,
  size = "sm",
  max,
  tone,
  className,
  ...rest
}: {
  count: number;
  size?: UnreadBadgeSize;
  /** Above this it says so instead of saying how many. Uncapped when absent. */
  max?: number;
  /** The disc's own colours. Passed in, because a tab's inactive badge is grey. */
  tone: string;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<"span">, "children">) {
  if (count < 1) return null;

  const shown = max !== undefined && count > max ? `${max}+` : String(count);

  return (
    <span
      className={cn(
        "numeric inline-flex shrink-0 items-center justify-center rounded-full",
        // Never the display font: see above. The line-height travels with the
        // size in SIZES, because written here it does not survive the merge.
        "font-sans font-extrabold",
        SIZES[size],
        // Room for a second character without letting one digit off centre:
        // justify-center centres inside the padding box either way.
        shown.length > 1 && (size === "xs" ? "px-0.5" : "px-1.5"),
        tone,
        className,
      )}
      {...rest}
    >
      {shown}
    </span>
  );
}
