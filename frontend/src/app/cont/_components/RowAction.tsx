"use client";

import type { ReactNode } from "react";

import { Button, ButtonLink } from "@/components/ui";

/**
 * One action on a list row, small enough to sit beside the item rather than on
 * top of it.
 *
 * <p>The label collapses below the `sm` breakpoint and the icon carries it,
 * because two labelled buttons on a 375px row leave the title about a third of
 * the width — which is the part somebody is actually reading. The label stays in
 * `aria-label` either way, so what collapses is the pixels and not the meaning.
 */
export function RowAction({
  label,
  icon,
  onClick,
  href,
  danger,
  loading,
}: {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  const text = <span className="hidden sm:inline">{label}</span>;

  if (href) {
    return (
      <ButtonLink href={href} variant="ghost" size="sm" aria-label={label} leftIcon={icon}>
        {text}
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
      {text}
    </Button>
  );
}
