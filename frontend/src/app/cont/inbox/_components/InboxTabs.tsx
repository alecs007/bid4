"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getUnreadCounts } from "@/lib/api/inbox";
import { useApi } from "@/lib/hooks/useApi";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/cont/inbox", label: "Mesaje", key: "messages" as const },
  { href: "/cont/inbox/notificari", label: "Notificări", key: "notifications" as const },
];

/**
 * Which half of the inbox is being read.
 *
 * <p>On a phone it is a strip stuck under the header, not a row inside the page: it is the one
 * control that switches everything below it, and a switch that scrolls away is one people stop
 * finding. Same two numbers as the mark in the bar, so a badge up there always has somewhere
 * obvious to go.
 *
 * <p>Two segments and a rule under the live one, rather than pills on a rail. Half a screen's width
 * each is far too wide for a pill to read as a pill, and the rail would draw a grey band across the
 * top of every conversation.
 */
export function InboxTabs({ className }: { className?: string }) {
  const pathname = usePathname();
  const { user } = useAuth();

  const { data } = useApi(() => getUnreadCounts(), `inbox:unread:${user?.id}`, {
    enabled: Boolean(user),
  });

  return (
    <nav
      aria-label="Inbox"
      className={cn(
        "sticky top-12 z-30 -mx-4 mb-4 flex border-b border-line bg-white sm:-mx-6 sm:top-14 lg:static lg:mx-0 lg:mb-4 lg:border-0 lg:bg-transparent",
        className,
      )}
    >
      {TABS.map((tab) => {
        const active =
          tab.href === "/cont/inbox"
            ? !pathname.startsWith("/cont/inbox/notificari")
            : pathname.startsWith(tab.href);
        const count = data?.[tab.key] ?? 0;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-2 py-3 font-display text-[15px] font-bold transition",
              // From lg it is an ordinary row of two, sitting above the panes
              // rather than spanning the width of the page.
              "lg:flex-none lg:justify-start lg:rounded-xl lg:px-3 lg:py-2",
              active
                ? "text-primary-700 lg:bg-primary-50"
                : "text-ink-600 hover:text-ink-900 lg:hover:bg-ink-50",
            )}
          >
            {tab.label}
            {count > 0 ? (
              <span
                className={cn(
                  "numeric inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold",
                  active
                    ? "bg-primary-600 text-white"
                    : "bg-ink-100 text-ink-700",
                )}
              >
                {count > 99 ? "99+" : count}
              </span>
            ) : null}

            {/* On the strip's own bottom edge, so it reads as part of the rule
                rather than as a line floating above it. */}
            {active ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-600 lg:hidden"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
