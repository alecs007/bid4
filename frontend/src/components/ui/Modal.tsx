"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Icons } from "@/components/icons";

import { scrollPageTo } from "@/components/layout/SmoothScroll";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";
import { SheetGrabber, useSheetDismiss } from "./sheetDismiss";
import { useViewportFrame } from "./viewportFrame";

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
  align?: "start" | "center";
  showClose?: boolean;
  closeLabel?: string;
}) {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const { grab, grabbed, pulling, panelStyle, backdropStyle } = useSheetDismiss(
    { open, onClose, panelRef },
  );
  const frame = useViewportFrame(open);

  useEffect(() => {
    if (!open) return;

    const returnTo = window.scrollY;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
    );
    focusable?.focus({ preventScroll: true });

    return () => {
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus({ preventScroll: true });
      if (Math.abs(window.scrollY - returnTo) > 1) {
        scrollPageTo(returnTo, { immediate: true });
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
  } as const;

  return createPortal(
    <div
      style={frame ? { top: frame.top, height: frame.height } : undefined}
      className="fixed inset-x-0 top-0 z-50 flex h-dvh items-end justify-center p-0 pt-12 sm:items-center sm:p-4 sm:pt-4"
    >
      <button
        type="button"
        aria-label={closeLabel}
        onClick={onClose}
        style={backdropStyle}
        className={cn(
          "absolute inset-0 cursor-default bg-ink-900/40 backdrop-blur-[2px]",
          pulling
            ? "transition-none"
            : "transition-opacity duration-200 ease-[var(--ease-out-soft)]",
        )}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        style={panelStyle}
        className={cn(
          "relative flex max-h-full w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-sm sm:rounded-3xl",
          grabbed ? "animate-none" : "animate-pop-in",
          pulling
            ? "transition-none"
            : "transition-transform duration-200 ease-[var(--ease-out-soft)]",
          sizes[size],
        )}
      >
        <div onPointerDown={grab} className="shrink-0 touch-none sm:touch-auto">
          <SheetGrabber />

          <div
            className={cn(
              "flex items-start gap-3 px-5 pt-2 pb-3 sm:pt-5",
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
                <p
                  id={`${id}-description`}
                  className="mt-1 text-sm text-ink-600"
                >
                  {description}
                </p>
              ) : null}
            </div>
            {showClose ? (
              <span className="hidden sm:block">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  onClick={onClose}
                  aria-label={closeLabel}
                >
                  <Icons.close
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />
                </Button>
              </span>
            ) : null}
          </div>
        </div>

        <div
          data-lenis-prevent
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-2 scroll-py-3",
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
