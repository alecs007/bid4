"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";
import type { Tone } from "@/lib/labels";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: Tone;
  icon?: ReactNode;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastApi {
  toast: (options: ToastOptions) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

let sequence = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    sequence += 1;
    const id = `toast-${sequence}`;
    setToasts((current) => [...current.slice(-2), { ...options, id }]);
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      dismiss,
      success: (title, description) =>
        toast({ title, description, tone: "success" }),
      error: (title, description) =>
        toast({ title, description, tone: "danger", duration: 7000 }),
      info: (title, description) => toast({ title, description, tone: "sky" }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast trebuie folosit în interiorul <ToastProvider>.");
  }
  return context;
}

const CHIP_SOFT: Record<Tone, string> = {
  primary: "bg-primary-100 text-primary-900",
  accent: "bg-accent-100 text-accent-900",
  sky: "bg-sky-100 text-sky-900",
  sun: "bg-sun-100 text-sun-900",
  success: "bg-success-100 text-success-700",
  warning: "bg-warning-100 text-warning-700",
  danger: "bg-danger-100 text-danger-700",
  neutral: "bg-ink-100 text-ink-700",
};

const CHIP_SOLID: Record<Tone, string> = {
  primary: "bg-primary-600 text-white",
  accent: "bg-accent-600 text-white",
  sky: "bg-sky-600 text-white",
  sun: "bg-sun-400 text-ink-900",
  success: "bg-success-600 text-white",
  warning: "bg-warning-600 text-white",
  danger: "bg-danger-600 text-white",
  neutral: "bg-ink-700 text-white",
};

/** How long a notice stands when nothing says otherwise, and how long it takes to leave. */
const DEFAULT_DURATION_MS = 4500;
const LEAVE_MS = 320;

/** The countdown bar, in the tone's own ink rather than the pale chip behind it. */
const BAR_SOFT: Record<Tone, string> = {
  primary: "bg-primary-500",
  accent: "bg-accent-500",
  sky: "bg-sky-500",
  sun: "bg-sun-400",
  success: "bg-success-600",
  warning: "bg-warning-600",
  danger: "bg-danger-600",
  neutral: "bg-ink-400",
};

const DEFAULT_ICONS: Record<Tone, ReactNode> = {
  primary: <Icons.donation aria-hidden="true" className="h-4 w-4 shrink-0" />,
  accent: <Icons.impact aria-hidden="true" className="h-4 w-4 shrink-0" />,
  sky: <Icons.info aria-hidden="true" className="h-4 w-4 shrink-0" />,
  sun: <Icons.warning aria-hidden="true" className="h-4 w-4 shrink-0" />,
  success: <Icons.success aria-hidden="true" className="h-4 w-4 shrink-0" />,
  warning: <Icons.warning aria-hidden="true" className="h-4 w-4 shrink-0" />,
  danger: <Icons.error aria-hidden="true" className="h-4 w-4 shrink-0" />,
  neutral: <Icons.info aria-hidden="true" className="h-4 w-4 shrink-0" />,
};

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-60 flex flex-col items-center p-4 sm:inset-x-auto sm:right-0 sm:items-end"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} toast={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const {
    id,
    title,
    description,
    tone = "neutral",
    duration,
    action,
    icon,
  } = toast;
  const loud = tone === "danger" || tone === "warning" || tone === "sun";
  const [leaving, setLeaving] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (!leaving) return;
    const timeout = window.setTimeout(() => onDismiss(id), LEAVE_MS);
    return () => window.clearTimeout(timeout);
  }, [leaving, id, onDismiss]);

  // A title-only toast is shorter than its own icon, so only stack when there is
  // something under the title to stack against.
  const stacked = Boolean(description || action);

  return (
    // The height is the stack's business: opened by a grid row so a new notice
    // pushes the ones above it rather than appearing under them, and closed the
    // same way so the gap it leaves shuts behind it. The spacing lives inside
    // the row, because a `gap` on the column would outlive the row that closed.
    <div
      className={cn(
        "grid w-full max-w-sm",
        leaving
          ? "animate-toast-close"
          : // motion-reduce keeps the base 1fr: the height is what makes the
            // notice visible at all, and it must not depend on an animation
            // that somebody has asked not to run.
            "animate-toast-open grid-rows-[1fr] motion-reduce:animate-none",
      )}
    >
      {/* The clip is what closes the row, and it was cropping the shadow off
          the card inside it. The padding is that shadow's room, and it belongs
          in here rather than on the column so it closes along with the row. */}
      <div className="overflow-hidden">
        <div className="px-1.5 pt-2 pb-1.5">
          <div
            role={tone === "danger" ? "alert" : "status"}
            onPointerEnter={() => setHeld(true)}
            onPointerLeave={() => setHeld(false)}
            onFocusCapture={() => setHeld(true)}
            onBlurCapture={() => setHeld(false)}
            className={cn(
              "pointer-events-auto relative flex w-full gap-3 rounded-2xl bg-white p-4 pb-5 shadow-sm",
              stacked ? "items-start" : "items-center",
              leaving
                ? "animate-toast-out"
                : "animate-toast-in motion-reduce:animate-none",
            )}
          >
            <span
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                stacked && "mt-0.5",
                loud ? CHIP_SOLID[tone] : CHIP_SOFT[tone],
              )}
            >
              {icon ?? DEFAULT_ICONS[tone]}
            </span>
            <div className="min-w-0 flex-1">
              {/* Both lines on leading-snug. The title was on the default 1.5,
                  which put 8px of half-leading under a 16px line and read as a
                  gap somebody had asked for. */}
              <p className="font-display leading-snug font-bold text-ink-900">
                {title}
              </p>
              {description ? (
                <p className="text-sm leading-snug text-ink-600">
                  {description}
                </p>
              ) : null}
              {action ? (
                <button
                  type="button"
                  onClick={() => {
                    action.onClick();
                    setLeaving(true);
                  }}
                  className="font-display mt-2 rounded-lg text-sm font-bold text-primary-700 underline decoration-2 underline-offset-4 transition hover:text-primary-800"
                >
                  {action.label}
                </button>
              ) : null}
            </div>
            <button
              type="button"
              aria-label="Închide notificarea"
              onClick={() => setLeaving(true)}
              className={cn(
                "-mr-1 shrink-0 rounded-xl p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700",
                stacked && "-mt-1",
              )}
            >
              <Icons.close aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>

            {/* How long it has left, and the clock itself: the bar's own end is
              what dismisses the notice, so the two can never disagree. Holding
              a pointer over it pauses the animation, which pauses the notice —
              nothing is counting down in JavaScript beside it. */}
            <span
              aria-hidden="true"
              className="absolute inset-x-4 bottom-2 h-1 overflow-hidden rounded-full bg-ink-100"
            >
              <span
                onAnimationEnd={() => setLeaving(true)}
                style={{
                  animationDuration: `${duration ?? DEFAULT_DURATION_MS}ms`,
                  animationPlayState: held || leaving ? "paused" : "running",
                }}
                className={cn(
                  "animate-toast-progress block h-full origin-left rounded-full",
                  loud ? CHIP_SOLID[tone] : BAR_SOFT[tone],
                )}
              />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
