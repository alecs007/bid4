"use client";

import type { ReactNode } from "react";

import { Button, EmptyState } from "@/components/ui";

/**
 * The only two things an account list says when it has nothing to show.
 *
 * <p>There are exactly two, and they are not the same: having nothing yet is a
 * fact about the account, and having nothing *here* is a fact about the filter.
 * The first needs somewhere to go, the second needs the filter cleared. Writing a
 * bespoke sentence per tab produced a handful of near-identical messages that
 * differed for no reason a reader could use.
 */
export function ListState({
  filtered,
  onReset,
  title,
  description,
  action,
}: {
  /** True when the account has rows and the current filter is what hid them. */
  filtered: boolean;
  onReset: () => void;
  /** Shown only when there is genuinely nothing yet. */
  title: string;
  description: string;
  action?: ReactNode;
}) {
  if (filtered) {
    return (
      <EmptyState
        title="Niciun rezultat"
        description="Nimic nu se potrivește cu filtrul ales."
        action={
          <Button variant="secondary" onClick={onReset}>
            Arată toate
          </Button>
        }
      />
    );
  }

  return <EmptyState title={title} description={description} action={action} />;
}
