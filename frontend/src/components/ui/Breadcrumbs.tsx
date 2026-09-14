import Link from "next/link";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Firimituri" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1.5 text-sm text-ink-500">
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className={cn("flex items-center gap-1.5", last && "min-w-0")}
            >
              {index > 0 ? (
                <Icons.crumb
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-ink-300"
                />
              ) : null}

              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="shrink-0 font-semibold transition hover:text-ink-900"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? "page" : undefined}
                  className="min-w-0 truncate font-semibold text-ink-700"
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
