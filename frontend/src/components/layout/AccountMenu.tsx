"use client";

import Link from "next/link";
import { Fragment } from "react";

import { Icons } from "@/components/icons";
import { ButtonLink } from "@/components/ui";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

export interface AccountLink {
  href: string;
  label: string;
  icon: keyof typeof Icons;
  /** Starts a new group: a rule is drawn above it. */
  group?: boolean;
}

/**
 * Everything behind "Contul meu", written once.
 *
 * <p>The desktop dropdown and the mobile panel show the same thing, and the two drifting is the
 * ordinary failure of building them separately: an item added to one, a label changed in the
 * other. They differ only in the box around them, which is the caller's business.
 *
 * <p>Signed out it is a pitch rather than a menu. A bare "Intră în cont" says what the button
 * does; it does not say why anyone would.
 */
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
  /** "menuitem" inside a role="menu"; omitted where the box is not a menu. */
  itemRole?: "menuitem";
}) {
  if (!user) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm leading-snug text-ink-600">
          Licitează, urmărește ce îți place și vezi cât ai strâns pentru cauzele
          susținute.
        </p>
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
      <p className="truncate px-2.5 pt-1.5 pb-2 font-display font-bold text-ink-900">
        {user.displayName}
      </p>

      {links.map((link) => {
        const Icon = Icons[link.icon];
        return (
          <Fragment key={link.href}>
            {/* A rule of its own where the subject changes. As a border on the
                row it followed the rounded corners and read as a box with a lid. */}
            {link.group ? rule : null}
            <Link
              href={link.href}
              role={itemRole}
              onClick={onNavigate}
              className={cn(item, "text-ink-700 hover:bg-ink-50 hover:text-ink-900")}
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
