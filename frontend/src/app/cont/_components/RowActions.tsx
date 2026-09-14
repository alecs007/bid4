"use client";

import type { ReactNode } from "react";

import { Icons } from "@/components/icons";
import { Button, ButtonLink, type ButtonVariant } from "@/components/ui";

export interface RowActionItem {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  unavailable?: string;
}

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
    variant?: ButtonVariant;
  };
  view: string;
  extra?: RowActionItem[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {primary ? (
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
        leftIcon={
          <Icons.reveal aria-hidden="true" className="h-4 w-4 shrink-0" />
        }
      >
        Vezi detalii
      </ButtonLink>

      {extra
        .filter((item) => !item.unavailable)
        .map((item) => (
          <Button
            key={item.label}
            type="button"
            variant="ghost"
            size="sm"
            leftIcon={item.icon}
            onClick={item.onClick}
            className={
              item.danger ? "text-danger-700 hover:bg-danger-50" : undefined
            }
          >
            {item.label}
          </Button>
        ))}
    </div>
  );
}
