import type { ReactNode } from "react";

import { Mascot, Skeleton, type MascotMood } from "@/components/ui";

export function AuthShell({
  mood = "happy",
  title,
  description,
  children,
  aside,
  footer,
}: {
  mood?: MascotMood;
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
      <Mascot mood={mood} size={84} floating />
      <div className="text-center">
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {title}
        </h1>
        <p className="mt-1.5 text-ink-600">{description}</p>
      </div>
      <div className="w-full rounded-3xl bg-white ring-1 ring-edge p-5 sm:p-6">
        {children}
      </div>
      {aside}
      {footer ? <div className="text-sm text-ink-600">{footer}</div> : null}
    </div>
  );
}

/** Matches the real card box for box: label + control per field, then the CTA. */
export function AuthFieldsSkeleton({ fields }: { fields: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-24 rounded-lg" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
      ))}
      <Skeleton className="h-13 w-full rounded-2xl" />
    </div>
  );
}
