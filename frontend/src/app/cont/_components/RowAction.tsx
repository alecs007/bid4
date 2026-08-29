"use client";

import type { ReactNode } from "react";

import { Button, ButtonLink } from "@/components/ui";

/**
 * One action on a list row.
 *
 * <p>Labelled at every width. The labels were collapsing on small screens back
 * when these sat beside the item and crowded the title; the row now gives them a
 * line of their own below `sm`, and on a line of their own there is no reason to
 * make somebody guess what a bare icon does.
 */
export function RowAction({
  label,
  icon,
  onClick,
  href,
  danger,
  primary,
  loading,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  /** The one action worth reaching for on this row. */
  primary?: boolean;
  loading?: boolean;
}) {
  if (href) {
    return (
      <ButtonLink
        href={href}
        variant={primary ? "primary" : "ghost"}
        size="sm"
        aria-label={label}
        leftIcon={icon}
      >
        {label}
      </ButtonLink>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      leftIcon={icon}
      loading={loading}
      onClick={onClick}
      className={danger ? "text-danger-700 hover:bg-danger-50" : undefined}
    >
      {label}
    </Button>
  );
}
