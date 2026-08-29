"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

/**
 * Always visible rather than on hover: a hint nobody can see on a touchscreen is
 * none.
 *
 * <p>Hover is bound to mice only. A tap synthesises `mouseenter` before it sends
 * `click`, so with a plain hover handler the first tap opened the hint and the
 * click that followed toggled it straight back shut — it took two taps to see
 * anything, and looked like the dot was broken.
 */
export function InfoHint({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span
      ref={wrapperRef}
      className={cn("relative inline-flex", className)}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-5 w-5 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
      >
        <Icons.help aria-hidden="true" className="h-4 w-4 shrink-0" />
      </button>

      {open ? (
        <span
          role="tooltip"
          className="animate-pop-in absolute right-0 bottom-full z-20 mb-2 w-60 rounded-xl bg-ink-900 px-3 py-2.5 text-left text-xs leading-relaxed font-normal text-white shadow-sm"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
