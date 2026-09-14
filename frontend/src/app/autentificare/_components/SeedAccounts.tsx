"use client";

import { useState } from "react";

import { Avatar, Badge, Skeleton } from "@/components/ui";
import { listSeedAccounts } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/AuthProvider";
import { SHOW_DEV_TOOLS } from "@/lib/config";
import { useApi } from "@/lib/hooks/useApi";
import { DEMO_PASSWORD } from "@/lib/mock/seed";
import { ACCOUNT_TYPE, USER_ROLE } from "@/lib/labels";
import type { User } from "@/lib/types";

export function SeedAccounts({
  onSignedIn,
}: {
  onSignedIn: (user: User) => void;
}) {
  const { switchAccount } = useAuth();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const { data: accounts, loading } = useApi(
    () => listSeedAccounts(),
    "seed-accounts",
    { enabled: SHOW_DEV_TOOLS },
  );

  if (!SHOW_DEV_TOOLS) return null;

  const signIn = async (account: User) => {
    setPendingId(account.id);
    try {
      await switchAccount(account.id);
      onSignedIn(account);
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="w-full rounded-3xl border-2 border-dashed border-ink-200 p-4">
      <p className="font-display text-sm font-extrabold text-ink-900">
        Conturi demo
      </p>
      <p className="mt-0.5 text-xs text-ink-600">
        Disponibile pe versiunea demonstrativă. Parola comună este{" "}
        <span className="font-bold">{DEMO_PASSWORD}</span>.
      </p>

      <div className="mt-3 flex flex-col gap-1.5">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-2xl" />
            ))
          : accounts?.map((account) => (
              <button
                key={account.id}
                type="button"
                disabled={pendingId !== null}
                onClick={() => signIn(account)}
                className="flex h-14 items-center gap-3 rounded-2xl px-2.5 text-left transition hover:bg-ink-50 disabled:opacity-60"
              >
                <Avatar
                  name={account.displayName}
                  src={account.avatarUrl}
                  accountType={account.accountType}
                  size="sm"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-ink-900">
                    {account.displayName}
                  </span>
                  <span className="block truncate text-xs text-ink-500">
                    {account.email} · {ACCOUNT_TYPE[account.accountType]}
                  </span>
                </span>
                <Badge tone={USER_ROLE[account.role].tone} size="sm">
                  {USER_ROLE[account.role].label}
                </Badge>
              </button>
            ))}
      </div>
    </div>
  );
}
