"use client";

import type { ReactNode } from "react";

import { Icons } from "@/components/icons";
import { useFieldProps } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

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
