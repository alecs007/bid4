import type { ReactNode } from "react";

import { Mascot, Skeleton, type MascotMood } from "@/components/ui";

export function AuthShell({
  mood = "hello",
  title,
  description,
  children,
  footer,
}: {
  mood?: MascotMood;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col items-center justify-center gap-5">
      <div className="w-full flex flex-col gap-5 items-center rounded-3xl bg-white ring-1 ring-edge p-6 sm:p-8">
        <Mascot mood={mood} size={96} />
        <div className="text-center">
          <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
            {title}
          </h1>
          <p className="mt-1.5 text-ink-600">{description}</p>
        </div>
        <div className="w-full">{children}</div>
      </div>

      {footer ? <div className="text-sm text-ink-600">{footer}</div> : null}
    </div>
  );
}

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
