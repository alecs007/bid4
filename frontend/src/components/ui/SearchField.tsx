"use client";

import { useState } from "react";

import { Icons } from "@/components/icons";
import { Input } from "./Field";
import { cn } from "@/lib/utils/cn";

/**
 * Keeps a draft while you type and seeds it from `term`. Key it on the term, so a
 * search arriving from elsewhere remounts it instead of leaving stale text.
 */
export function SearchField({
  term,
  onSearch,
  label,
  placeholder,
  className,
  inputClassName,
}: {
  term: string;
  onSearch: (value: string) => void;
  label: string;
  placeholder: string;
  className?: string;
  inputClassName?: string;
}) {
  const [draft, setDraft] = useState(term);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft.trim());
      }}
      className={cn("min-w-0", className)}
    >
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={inputClassName}
        leading={<Icons.search aria-hidden="true" className="h-4 w-4" />}
      />
    </form>
  );
}
