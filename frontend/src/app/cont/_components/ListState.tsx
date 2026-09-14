"use client";

import type { ReactNode } from "react";

import { Button, EmptyState } from "@/components/ui";

export function ListState({
  filtered,
  onReset,
  title,
  description,
  action,
}: {
  filtered: boolean;
  onReset: () => void;
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
