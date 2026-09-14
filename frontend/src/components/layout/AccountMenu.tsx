"use client";

import Link from "next/link";
import { Fragment } from "react";

import { Icons } from "@/components/icons";
import { Avatar, ButtonLink } from "@/components/ui";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export interface AccountLink {
  href: string;
  label: string;
  icon: keyof typeof Icons;
  group?: boolean;
}

export function AccountMenu({
  user,
  isStaff,
  isAdmin,
  links,
  counts,
  onNavigate,
  onSignOut,
  itemRole,
}: {
  user: User | null;
  isStaff: boolean;
  isAdmin: boolean;
  links: AccountLink[];
  counts: Record<string, number | undefined>;
  onNavigate: () => void;
  onSignOut: () => void;
  itemRole?: "menuitem";
}) {
  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-ink-500"
            >
              <Icons.accountRound className="h-5 w-5" />
            </span>
            <p className="min-w-0 truncate font-display font-bold text-ink-900">
              Salut, utilizator anonim
            </p>
          </div>
          <p className="mt-2 text-[13px] leading-snug text-ink-600">
            Te așteptăm cu cele mai deosebite licitații atunci când ești
            pregătit să te autentifici.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <ButtonLink href="/autentificare" fullWidth onClick={onNavigate}>
            Intră în cont
          </ButtonLink>
          <ButtonLink
            href="/inregistrare"
            variant="secondary"
            fullWidth
            onClick={onNavigate}
          >
            Creează-ți contul
          </ButtonLink>
        </div>
      </div>
    );
  }

  const item =
    "flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[15px] font-semibold transition";
  const rule = <span aria-hidden="true" className="my-1 block h-px bg-line" />;

  return (
    <>
      <div className="flex items-center gap-3 px-2.5 pt-1.5 pb-2.5">
        <Avatar
          name={user.displayName}
          src={user.avatarUrl}
          accountType={user.accountType}
          size="sm"
        />
        <div className="min-w-0">
          <p className="truncate font-display font-bold text-ink-900">
            {user.displayName}
          </p>
          <p className="truncate text-[13px] text-ink-500">@{user.username}</p>
        </div>
      </div>
      {rule}

      {links.map((link) => {
        const Icon = Icons[link.icon];
        return (
          <Fragment key={link.href}>
            {link.group ? rule : null}
            <Link
              href={link.href}
              role={itemRole}
              onClick={onNavigate}
              className={cn(
                item,
                "text-ink-700 hover:bg-ink-50 hover:text-ink-900",
              )}
            >
              <Icon
                aria-hidden="true"
                className="h-4.5 w-4.5 shrink-0 text-ink-500"
              />
              <span className="flex-1">{link.label}</span>
              {counts[link.href] ? (
                <span className="numeric rounded-lg bg-primary-50 px-1.5 py-0.5 text-xs font-extrabold text-primary-800">
                  {counts[link.href]}
                </span>
              ) : null}
            </Link>
          </Fragment>
        );
      })}

      {isStaff ? (
        <>
          {rule}
          <Link
            href={isAdmin ? "/admin" : "/operator/cauze"}
            role={itemRole}
            onClick={onNavigate}
            className={cn(item, "text-sky-700 hover:bg-sky-50")}
          >
            <Icons.secure aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
            {isAdmin ? "Administrare" : "Zona operator"}
          </Link>
        </>
      ) : null}

      {rule}
      <button
        type="button"
        role={itemRole}
        onClick={onSignOut}
        className={cn(
          item,
          "w-full text-left text-danger-700 hover:bg-danger-50",
        )}
      >
        <Icons.signOut aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
        Ieși din cont
      </button>
    </>
  );
}
