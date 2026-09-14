"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { UnreadBadge } from "@/components/ui";
import { getUnreadCounts } from "@/lib/api/inbox";
import { useApi } from "@/lib/hooks/useApi";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils/cn";

const TABS = [
  { href: "/cont/inbox", label: "Mesaje", key: "messages" as const },
  { href: "/cont/inbox/notificari", label: "Notificări", key: "notifications" as const },
];

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
        "sticky top-12 z-30 -mx-4 -mt-5 mb-4 flex border-b border-line bg-white sm:-mx-6 sm:-mt-8 sm:top-14 lg:hidden",
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
              active ? "text-primary-700" : "text-ink-600 hover:text-ink-900",
            )}
          >
            {tab.label}
            <UnreadBadge
              count={count}
              max={99}
              tone={
                active ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-700"
              }
            />

            {active ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-600"
              />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
