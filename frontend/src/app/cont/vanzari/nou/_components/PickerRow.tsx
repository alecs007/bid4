"use client";

import type { ReactNode } from "react";

import { Icons } from "@/components/icons";
import { useFieldProps } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * A field whose choice is too large to live in the form: the row holds the answer, the modal holds
 * the choosing.
 *
 * <p>Nine illustrated tiles and a rail of portraits were pushing everything else off the screen,
 * and each of them was a decision made once. In a modal they get the room they were drawn for, and
 * the form goes back to being a column of answers a seller can read down in one pass.
 *
 * <p>Shaped like the inputs beside it rather than like a button, because it is one of those
 * answers and belongs in the same column. Empty it carries the prompt and a plus; filled it hands
 * its whole width to whatever the answer is, since a category, a price and a cause are read in
 * three different shapes.
 */
export function PickerRow({
  placeholder,
  filled,
  invalid,
  onOpen,
  children,
}: {
  placeholder: string;
  filled: boolean;
  invalid?: boolean;
  onOpen: () => void;
  children: ReactNode;
}) {
  const fieldProps = useFieldProps();

  return (
    <button
      {...fieldProps}
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3 text-left ring-1 transition",
        // focus-visible, not focus: closing the modal hands focus back to this
        // button, and a ring drawn then reads as a second selection mark on a
        // row that has just been answered.
        "focus-visible:ring-primary-500 focus-visible:outline-none",
        invalid ? "ring-danger-500" : "ring-ink-200 hover:ring-ink-300",
      )}
    >
      <span className="flex min-h-6 min-w-0 flex-1 items-center">
        {filled ? (
          children
        ) : (
          <span className="text-base text-ink-500 sm:text-[15px]">
            {placeholder}
          </span>
        )}
      </span>

      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-full transition",
          filled ? "bg-ink-100 text-ink-600" : "bg-primary-50 text-primary-700",
        )}
      >
        {filled ? (
          <Icons.edit aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Icons.add aria-hidden="true" className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}
