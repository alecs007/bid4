"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { matchesSearch } from "@/lib/utils/search";
import { cn } from "@/lib/utils/cn";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  prefix?: string;
}

export function Select<T extends string>({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "Alege",
  size = "md",
  className,
  fullWidth = true,
  searchable = false,
  searchPlaceholder = "Caută",
  clearLabel,
}: {
  value: T | "";
  options: SelectOption<T>[];
  onChange: (value: T | "") => void;
  ariaLabel: string;
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
  fullWidth?: boolean;
  /** Adds a filter box above the list — for lists too long to scan. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /** Label for the entry that clears the choice, e.g. "Toate cauzele". */
  clearLabel?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = options.find((option) => option.value === value);

  // The clear entry sits on top while nothing is searched for: it answers "all of
  // them", it is not a match for a term.
  const matches = query
    ? options.filter((option) => matchesSearch(option.label, query))
    : options;

  const entries: SelectOption<T | "">[] =
    clearLabel && !query
      ? [{ value: "" as T | "", label: clearLabel }, ...matches]
      : matches;

  const currentIndex = Math.max(
    0,
    entries.findIndex((option) => option.value === value),
  );

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus();
  }, [open, searchable]);

  const openList = () => {
    setQuery("");
    setActiveIndex(currentIndex);
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = entries[index];
    if (!option) return;
    onChange(option.value);
    close();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openList();
      }
      return;
    }

    switch (event.key) {
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, entries.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(entries.length - 1);
        break;
      case "Enter":
        event.preventDefault();
        commit(activeIndex);
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative", fullWidth && "w-full", className)}
    >
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          "flex w-full items-center gap-2 rounded-xl bg-white text-left font-semibold text-ink-900 transition",
          "ring-1 ring-ink-200 hover:ring-ink-300",
          open && "ring-2 ring-primary-500",
          size === "sm" ? "h-10 px-3 text-sm" : "h-12 px-4 text-[15px]",
        )}
      >
        <span className="min-w-0 flex-1 truncate">
          {selected ? (
            <>
              {selected.prefix ? (
                <span aria-hidden="true" className="mr-1.5">
                  {selected.prefix}
                </span>
              ) : null}
              {selected.label}
            </>
          ) : (
            <span className="text-ink-500">{placeholder}</span>
          )}
        </span>
        <Icons.expand
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-ink-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-30 mt-1.5 w-full min-w-max rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-line animate-pop-in",
          )}
        >
          {/* Quiet on purpose: it sits inside an already-open menu, so a filled
              box would shout over the options it exists to narrow. */}
          {searchable ? (
            <div className="mb-1.5 flex h-10 items-center gap-2 rounded-xl px-3 ring-1 ring-line transition focus-within:ring-ink-300">
              <Icons.search
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-ink-500"
              />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onKeyDown}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                aria-controls={`${id}-list`}
                className="min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
              />
            </div>
          ) : null}

          <ul
            ref={listRef}
            id={`${id}-list`}
            role="listbox"
            aria-label={ariaLabel}
            tabIndex={-1}
            data-lenis-prevent
            className="max-h-64 overflow-y-auto"
          >
            {entries.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li key={option.value || "__clear"} data-index={index}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => commit(index)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[15px] font-semibold transition",
                      index === activeIndex ? "bg-ink-100" : "bg-transparent",
                      isSelected ? "text-primary-800" : "text-ink-800",
                      !option.value && "text-ink-600",
                    )}
                  >
                    {option.prefix ? (
                      <span aria-hidden="true">{option.prefix}</span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                    </span>
                    {isSelected ? (
                      <Icons.check
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-primary-600"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}

            {entries.length === 0 ? (
              <li className="px-3 py-2 text-[15px] text-ink-500">
                Niciun rezultat
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
