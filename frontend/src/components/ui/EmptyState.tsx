import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { Mascot, type MascotMood } from "./Mascot";

export function EmptyState({
  title,
  description,
  action,
  mood = "thinking",
  compact = false,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  mood?: MascotMood;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-3xl bg-white ring-1 ring-edge text-center",
        compact ? "gap-3 px-6 py-8" : "gap-4 px-6 py-14",
        className,
      )}
    >
      <Mascot mood={mood} size={compact ? 72 : 104} floating />
      <div className="max-w-md">
        <h3
          className={cn(
            "font-display font-extrabold text-ink-900",
            compact ? "text-lg" : "text-xl",
          )}
        >
          {title}
        </h3>
        {description ? (
          <p className="mt-1.5 text-ink-600">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Nu am putut încărca datele",
  description = "A apărut o problemă de conexiune. Mai încearcă o dată.",
  action,
  className,
}: {
  title?: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <EmptyState
      mood="sad"
      title={title}
      description={description}
      action={action}
      className={className}
    />
  );
}
