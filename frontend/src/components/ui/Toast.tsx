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

/**
 * Toasts confirm that something happened: a bid landed, an order was
 * confirmed, a label downloaded, a cause was submitted. They are the standard
 * feedback channel for user actions — inline <Alert> stays for state that
 * belongs to the page itself.
 */

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: Tone;
  /** Swap the default glyph; `Icons` in components/icons is the registry. */
  icon?: ReactNode;
  /** Milliseconds on screen. Errors linger longer by default. */
  duration?: number;
  /** One optional inline action, e.g. "Vezi comanda". */
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
    // Keep the stack shallow: older toasts fall off the top.
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

/* -------------------------------------------------------------------------- */

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

const DEFAULT_ICONS: Record<Tone, ReactNode> = {
  primary: <Icons.donation aria-hidden="true" className="h-4 w-4" />,
  accent: <Icons.impact aria-hidden="true" className="h-4 w-4" />,
  sky: <Icons.info aria-hidden="true" className="h-4 w-4" />,
  sun: <Icons.warning aria-hidden="true" className="h-4 w-4" />,
  success: <Icons.success aria-hidden="true" className="h-4 w-4" />,
  warning: <Icons.warning aria-hidden="true" className="h-4 w-4" />,
  danger: <Icons.error aria-hidden="true" className="h-4 w-4" />,
  neutral: <Icons.info aria-hidden="true" className="h-4 w-4" />,
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
      className="pointer-events-none fixed inset-x-0 bottom-0 z-60 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-0 sm:items-end"
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
  const { id, title, description, tone = "neutral", duration, action, icon } = toast;
  const loud = tone === "danger" || tone === "warning" || tone === "sun";
  const [leaving, setLeaving] = useState(false);

  // Both timers write state from a callback, never synchronously in the effect.
  useEffect(() => {
    const timeout = window.setTimeout(() => setLeaving(true), duration ?? 4500);
    return () => window.clearTimeout(timeout);
  }, [duration]);

  useEffect(() => {
    if (!leaving) return;
    const timeout = window.setTimeout(() => onDismiss(id), 200);
    return () => window.clearTimeout(timeout);
  }, [leaving, id, onDismiss]);

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl border border-ink-200 bg-white p-4 shadow-sm",
        leaving ? "animate-toast-out" : "animate-toast-in",
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          loud ? CHIP_SOLID[tone] : CHIP_SOFT[tone],
        )}
      >
        {icon ?? DEFAULT_ICONS[tone]}
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-display font-bold text-ink-900">{title}</p>
        {description ? (
          <p className="mt-0.5 text-sm leading-snug text-ink-600">
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
            className="mt-2 rounded-lg font-display text-sm font-bold text-primary-700 underline decoration-2 underline-offset-4 transition hover:text-primary-800"
          >
            {action.label}
          </button>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Închide notificarea"
        onClick={() => setLeaving(true)}
        className="-mt-1 -mr-1 shrink-0 rounded-xl p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
      >
        <Icons.close aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
