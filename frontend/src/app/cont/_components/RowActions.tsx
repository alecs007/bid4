"use client";

import type { ReactNode } from "react";

import { Icons } from "@/components/icons";
import { Button, ButtonLink, type ButtonVariant } from "@/components/ui";

export interface RowActionItem {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  /**
   * Why this cannot be done right now. Present means the action is shown and
   * disabled rather than dropped — a button that vanishes and a button that was
   * never there look identical to a reader, and both leave them wondering
   * whether they missed it.
   */
  unavailable?: string;
}

/**
 * The actions on a list row, on a line of their own.
 *
 * <p>All of them, in the open. They were briefly behind a menu, which kept the
 * row tidy at the cost of hiding the one thing somebody might be looking for
 * behind a button that does not say what is under it. A line of its own costs
 * the row about thirty pixels and needs no explaining.
 *
 * <p>Order is fixed, so the same action sits in the same place on every row: the
 * move this row's state suggests, then opening the item, then anything
 * destructive, last and apart.
 */
export function RowActions({
  primary,
  view,
  extra = [],
}: {
  primary?: {
    label: string;
    icon: ReactNode;
    href?: string;
    onClick?: () => void;
    /** Green unless the row's state is urgent, where coral says so. */
    variant?: ButtonVariant;
  };
  view: string;
  extra?: RowActionItem[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {primary ? (
        // Flat: the raised edge is for the one call to action on a page, and a
        // list where every other row carries one is a page of raised edges.
        primary.href ? (
          <ButtonLink
            href={primary.href}
            variant={primary.variant}
            size="sm"
            leftIcon={primary.icon}
            className="[--btn-depth:0px]"
          >
            {primary.label}
          </ButtonLink>
        ) : (
          <Button
            variant={primary.variant}
            size="sm"
            leftIcon={primary.icon}
            onClick={primary.onClick}
            className="[--btn-depth:0px]"
          >
            {primary.label}
          </Button>
        )
      ) : null}

      <ButtonLink
        href={view}
        variant="ghost"
        size="sm"
        leftIcon={<Icons.reveal aria-hidden="true" className="h-4 w-4 shrink-0" />}
      >
        Vezi detalii
      </ButtonLink>

      {extra.map((item) => (
        <Button
          key={item.label}
          type="button"
          variant="ghost"
          size="sm"
          leftIcon={item.icon}
          disabled={Boolean(item.unavailable)}
          // The reason, on the control it explains. Without it a greyed button
          // is a refusal with no argument.
          title={item.unavailable}
          onClick={item.onClick}
          className={
            item.danger && !item.unavailable ? "text-danger-700 hover:bg-danger-50" : undefined
          }
        >
          {item.label}
        </Button>
      ))}
    </div>
  );
}
