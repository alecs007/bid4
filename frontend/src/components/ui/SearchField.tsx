"use client";

import { useState } from "react";

import { Icons } from "@/components/icons";
import { Input } from "./Field";
import { cn } from "@/lib/utils/cn";

/**
 * A search box whose text is owned by the URL.
 *
 * It keeps a draft while you type, so the list is not refiltered on every
 * keystroke, and seeds that draft from `term`. Key it on the term — `<SearchField
 * key={q} term={q} …>` — and a search arriving from somewhere else, the header
 * field for one, remounts it with the new text instead of leaving the box
 * showing something the results no longer match.
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
