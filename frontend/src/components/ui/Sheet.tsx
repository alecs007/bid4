"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { createPortal } from "react-dom";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

/**
 * Portalled to `document.body`: the page wrapper's opacity animation makes it a
 * stacking context, so a `z-50` overlay inside it loses to the `z-40` header.
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    panelRef.current
      ?.querySelector<HTMLElement>(
        "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
      )
      ?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus();
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Închide"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-900/40 animate-fade-in"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className={cn(
          "relative flex max-h-[88vh] w-full flex-col rounded-t-3xl bg-white",
          "animate-[toast-in_0.28s_cubic-bezier(0.2,0.9,0.3,1.1)_both] sm:max-w-md sm:rounded-3xl",
          className,
        )}
      >
        <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3">
          <h2
            id={`${id}-title`}
            className="font-display text-lg font-extrabold text-ink-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="-mr-1 rounded-xl p-2 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
          >
            <Icons.close aria-hidden="true" className="h-5 w-5 shrink-0" />
          </button>
        </div>
        <div
          data-lenis-prevent
          className="min-h-0 flex-1 overflow-y-auto px-5 pb-4"
        >
          {children}
        </div>

        {footer ? (
          <div className="flex gap-2 border-t border-line bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
