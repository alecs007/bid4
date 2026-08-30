/** The card body. No ring and no padding: the photograph is the edge. */
export const CARD_SHELL = "flex flex-col rounded-3xl bg-white";

/** Portrait, which is the shape phone cameras actually produce. */
export const CARD_MEDIA =
  "relative aspect-[3/4] w-full overflow-hidden rounded-2xl";

export const CARD_BODY = "flex flex-1 flex-col px-2 py-2 sm:px-3 sm:py-2";

/**
 * Set on the title's own box so `em` below it resolves against the type size the
 * card actually uses, at both widths.
 */
export const CARD_TITLE_TYPE =
  "font-display text-[14px] leading-[1.3] sm:text-base";

/** Two clamped lines. The skeleton fills the same box rather than guessing px. */
export const CARD_TITLE_BOX = "min-h-[2.6em]";

/** The price row: baseline-aligned, with the countdown or status opposite. */
export const CARD_FOOTER =
  "mt-auto flex items-end justify-between gap-1.5 pt-2.5";
