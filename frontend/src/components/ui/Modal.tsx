"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icons } from "@/components/icons";

import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

/**
 * Accessible dialog: Escape to close, backdrop click to close, focus moved in
 * on open and returned to the trigger on close, background scroll locked.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  closeLabel = "Închide",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
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

  if (!open) return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  } as const;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
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
          "relative w-full animate-pop-in rounded-t-3xl border border-ink-200 bg-white p-6 shadow-sm sm:rounded-3xl",
          sizes[size],
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
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
          <Button
            variant="ghost"
            size="sm"
            iconOnly
            onClick={onClose}
            aria-label={closeLabel}
          >
            <Icons.close aria-hidden="true" className="h-5 w-5" />
          </Button>
        </div>

        {children}

        {footer ? (
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
