"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  className,
  ariaLabel,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
  ariaLabel: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-ink-100 p-1",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full font-display font-bold whitespace-nowrap transition",
              size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2 text-[15px]",
              selected
                ? "bg-white text-ink-900"
                : "text-ink-600 hover:text-ink-900",
            )}
          >
            {option.label}
            {typeof option.count === "number" ? (
              <span
                className={cn(
                  "numeric rounded-full px-1.5 py-0.5 text-xs font-extrabold",
                  selected
                    ? "bg-primary-100 text-primary-900"
                    : "bg-ink-200 text-ink-700",
                )}
              >
                {option.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export interface NavTabItem {
  href: string;
  label: ReactNode;
  icon?: ReactNode;
  count?: number;
}

export function NavTabs({
  items,
  className,
  ariaLabel,
}: {
  items: NavTabItem[];
  className?: string;
  ariaLabel: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label={ariaLabel}
      className={cn(
        "-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0",
        className,
      )}
    >
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 font-display font-bold whitespace-nowrap transition",
              active
                ? "bg-primary-100 text-primary-900"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            )}
          >
            {item.icon ? (
              <span aria-hidden="true" className="text-lg">
                {item.icon}
              </span>
            ) : null}
            {item.label}
            {typeof item.count === "number" && item.count > 0 ? (
              <span className="numeric rounded-full bg-accent-500 px-1.5 py-0.5 text-xs font-extrabold text-white">
                {item.count}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
