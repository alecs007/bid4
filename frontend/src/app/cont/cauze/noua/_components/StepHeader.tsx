import type { ReactNode } from "react";

export function StepHeader({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-5">
      <h2 className="font-display text-xl font-extrabold text-ink-900 sm:text-2xl">
        {title}
      </h2>
      <p className="mt-1.5 text-ink-600">{lead}</p>
      {children}
    </div>
  );
}
