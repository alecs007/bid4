"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";

import { listSeedAccounts } from "@/lib/api/auth";
import { SHOW_DEV_TOOLS } from "@/lib/config";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import { resetWorld } from "@/lib/mock/store";
import { ACCOUNT_TYPE, USER_ROLE } from "@/lib/labels";
import { cn } from "@/lib/utils/cn";
import { Avatar, Badge, Button, Skeleton, useToast } from "@/components/ui";

export function DevRoleSwitcher() {
  const [open, setOpen] = useState(false);
  const { user, switchAccount, logout } = useAuth();
  const toast = useToast();

  const { data: accounts, loading } = useApi(
    () => listSeedAccounts(),
    "seed-accounts",
    { enabled: SHOW_DEV_TOOLS && open },
  );

  if (!SHOW_DEV_TOOLS) return null;

  const handleSwitch = async (userId: string, name: string) => {
    await switchAccount(userId);
    toast.success("Cont schimbat", `Ești autentificat ca ${name}.`);
    setOpen(false);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 print:hidden">
      {open ? (
        <div className="w-80 max-w-[calc(100vw-2rem)] rounded-3xl bg-white ring-1 ring-edge p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="font-display font-extrabold text-ink-900">
              Conturi demo
            </p>
            <button
              type="button"
              aria-label="Închide comutatorul de rol"
              onClick={() => setOpen(false)}
              className="rounded-xl p-1.5 text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
            >
              <Icons.close aria-hidden="true" className="h-4 w-4 shrink-0" />
            </button>
          </div>
          <div className="flex flex-col gap-1.5">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-2xl" />
                ))
              : accounts?.map((account) => {
                  const active = account.id === user?.id;
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() =>
                        handleSwitch(account.id, account.displayName)
                      }
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border p-2.5 text-left transition",
                        active
                          ? "border-primary-500 bg-primary-50"
                          : "border-transparent hover:bg-ink-50",
                      )}
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
                          {ACCOUNT_TYPE[account.accountType]}
                        </span>
                      </span>
                      <Badge tone={USER_ROLE[account.role].tone} size="sm">
                        {USER_ROLE[account.role].label}
                      </Badge>
                    </button>
                  );
                })}
          </div>
          <div className="mt-3 flex gap-2 border-t border-line pt-3">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Icons.refresh aria-hidden="true" className="h-4 w-4 shrink-0" />}
              onClick={() => {
                resetWorld();
                toast.info(
                  "Date resetate",
                  "Lumea demo a fost readusă la starea inițială.",
                );
                window.location.reload();
              }}
            >
              Resetează datele
            </Button>
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await logout();
                  toast.info("Te-ai deconectat");
                  setOpen(false);
                }}
              >
                Ieși din cont
              </Button>
            ) : null}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 font-display text-sm font-bold text-ink-800 transition hover:border-ink-300"
        >
          <Icons.roleSwitch aria-hidden="true" className="h-4 w-4 text-primary-700" />
          {user ? user.displayName.split(" ")[0] : "Vizitator"}
          <Badge tone={user ? USER_ROLE[user.role].tone : "neutral"} size="sm">
            {user ? USER_ROLE[user.role].label : "Neautentificat"}
          </Badge>
          <Icons.collapse aria-hidden="true" className="h-4 w-4 text-ink-400" />
        </button>
      )}
    </div>
  );
}
