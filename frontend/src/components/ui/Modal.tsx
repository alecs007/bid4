"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Icons } from "@/components/icons";

import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

/**
 * Portalled to `document.body`: the page wrapper's opacity animation makes it a
 * stacking context, so a `z-50` overlay inside it loses to the `z-40` header.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  align = "start",
  showClose = true,
  closeLabel = "Închide",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
  /** Centre the heading when it carries its own artwork above the words. */
  align?: "start" | "center";
  /**
   * The corner dismiss. Turn it off only where the footer already carries an
   * unmissable way out, so the reader is never sealed in.
   */
  showClose?: boolean;
  closeLabel?: string;
}) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus();

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

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  } as const;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 pt-[6dvh] sm:items-center sm:p-4 sm:pt-4">
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-ink-900/40 backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        className={cn(
          // max-h-full, measured against the wrapper's own definite height,
          // rather than a viewport unit: the cap is what makes the body below
          // scroll, and a panel that outgrows it puts its content off-screen
          // with no way to reach it. The wrapper's padding sets the inset.
          "relative flex max-h-full w-full animate-pop-in flex-col overflow-hidden rounded-t-3xl bg-white shadow-sm sm:rounded-3xl",
          sizes[size],
        )}
      >
        <div
          className={cn(
            "flex shrink-0 items-start gap-3 px-5 pt-5 pb-3",
            align === "center" ? "flex-col items-center" : "justify-between",
          )}
        >
          <div className={cn("min-w-0", align === "center" && "text-center")}>
            <h2
              id={`${id}-title`}
              className="font-display text-xl font-extrabold text-ink-900"
            >
              {title}
            </h2>
            {description ? (
              <p id={`${id}-description`} className="mt-1 text-sm text-ink-600">
                {description}
              </p>
            ) : null}
          </div>
          {showClose ? (
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              onClick={onClose}
              aria-label={closeLabel}
            >
              <Icons.close aria-hidden="true" className="h-5 w-5 shrink-0" />
            </Button>
          ) : null}
        </div>

        {/* min-h-0 is what lets this scroll: without it the flex item refuses
            to shrink under its content and the panel grows past the cap.

            The bottom padding is conditional because a footer already carries
            its own; without one, the content ran flush into the panel's edge. */}
        <div
          // Lenis owns the wheel and will happily scroll the page underneath
          // while the panel's own overflow sits untouched, which leaves
          // anything below the fold of a tall modal unreachable.
          data-lenis-prevent
          className={cn(
            // py-1 because the scroller clips at its padding box, and a chosen
            // tile's ring sits outside its own edge: without it the ring came
            // out shaved along the top and bottom of the list.
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-1",
            footer ? undefined : "pb-5",
          )}
        >
          {children}
        </div>

        {footer ? (
          <div className="flex shrink-0 flex-col-reverse gap-2 px-5 pt-3 pb-5 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
