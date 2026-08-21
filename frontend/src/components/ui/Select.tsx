"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

/**
 * A dropdown in the app's own clothes.
 *
 * The native `<select>` renders an OS menu that ignores every token in the
 * design system, so this is a listbox: a button that opens a themed panel.
 * Keyboard support matches the native control (arrows, Home/End, Enter,
 * Escape, and type-ahead is deliberately left out in favour of arrow keys).
 */

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** Optional leading glyph, e.g. a category emoji. */
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
}: {
  value: T | "";
  options: SelectOption<T>[];
  onChange: (value: T | "") => void;
  ariaLabel: string;
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
  fullWidth?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((option) => option.value === value);
  const currentIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  const openList = () => {
    setActiveIndex(currentIndex);
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    setOpen(false);
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
        setOpen(false);
        break;
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, options.length - 1));
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
        setActiveIndex(options.length - 1);
        break;
      case "Enter":
      case " ":
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
        onClick={() => (open ? setOpen(false) : openList())}
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
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={ariaLabel}
          tabIndex={-1}
          data-lenis-prevent
          className="absolute z-30 mt-1.5 max-h-72 w-full min-w-max overflow-y-auto rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-line animate-pop-in"
        >
          {options.map((option, index) => {
            const isSelected = option.value === value;
            return (
              <li key={option.value} data-index={index}>
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
                  )}
                >
                  {option.prefix ? (
                    <span aria-hidden="true">{option.prefix}</span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{option.label}</span>
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
        </ul>
      ) : null}
    </div>
  );
}
