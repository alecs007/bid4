"use client";

import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { createContext, useContext, useId } from "react";
import { Icons } from "@/components/icons";

import { cn } from "@/lib/utils/cn";

interface FieldContextValue {
  inputId: string;
  hintId?: string;
  errorId?: string;
  invalid: boolean;
}

const FieldContext = createContext<FieldContextValue | null>(null);

export function Field({
  label,
  hint,
  error,
  required,
  optionalLabel = false,
  className,
  children,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optionalLabel?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const id = useId();
  const inputId = `${id}-input`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <FieldContext.Provider
      value={{ inputId, hintId, errorId, invalid: Boolean(error) }}
    >
      <div className={cn("flex flex-col gap-1.5", className)}>
        <label
          htmlFor={inputId}
          className="font-display text-sm font-bold text-ink-800"
        >
          {label}
          {required ? (
            <span className="text-accent-600" aria-hidden="true">
              {" "}
              *
            </span>
          ) : null}
          {optionalLabel ? (
            <span className="ml-1 font-sans text-xs font-normal text-ink-500">
              (opțional)
            </span>
          ) : null}
        </label>

        {hint ? (
          <p id={hintId} className="text-xs leading-relaxed text-ink-600">
            {hint}
          </p>
        ) : null}

        {children}

        {error ? (
          <p
            id={errorId}
            role="alert"
            className="flex items-center gap-1.5 text-sm font-semibold text-danger-600"
          >
            <Icons.error className="h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}
      </div>
    </FieldContext.Provider>
  );
}

function useFieldProps() {
  const context = useContext(FieldContext);
  if (!context) return {};
  return {
    id: context.inputId,
    "aria-describedby":
      [context.hintId, context.errorId].filter(Boolean).join(" ") || undefined,
    "aria-invalid": context.invalid || undefined,
  };
}

const CONTROL_BASE =
  "w-full rounded-2xl bg-white text-ink-900 placeholder:text-ink-500 " +
  "ring-1 ring-ink-200 transition-[box-shadow] hover:ring-ink-300 " +
  "focus:ring-2 focus:ring-primary-500 focus-visible:outline-none " +
  "aria-[invalid]:ring-2 aria-[invalid]:ring-danger-500 " +
  "disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400";

export interface InputProps extends ComponentPropsWithoutRef<"input"> {
  leading?: ReactNode;
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ className, leading, trailing, ...props }: InputProps) {
  const fieldProps = useFieldProps();

  if (!leading && !trailing) {
    return (
      <input
        {...fieldProps}
        {...props}
        className={cn(CONTROL_BASE, "h-12 px-4 text-[15px]", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "group flex h-12 items-center gap-2 rounded-2xl bg-white px-4 ring-1 ring-ink-200 transition",
        "focus-within:ring-2 focus-within:ring-primary-500 hover:ring-ink-300",
        (props["aria-invalid"] ?? fieldProps["aria-invalid"])
          ? "ring-danger-500"
          : "",
        className,
      )}
    >
      {leading ? (
        <span className="shrink-0 text-ink-500" aria-hidden="true">
          {leading}
        </span>
      ) : null}
      <input
        {...fieldProps}
        {...props}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
      />
      {trailing ? (
        <span className="shrink-0 font-semibold text-ink-500">{trailing}</span>
      ) : null}
    </div>
  );
}

export function Textarea({
  className,
  rows = 4,
  ...props
}: ComponentPropsWithoutRef<"textarea">) {
  const fieldProps = useFieldProps();
  return (
    <textarea
      rows={rows}
      {...fieldProps}
      {...props}
      className={cn(CONTROL_BASE, "resize-y px-4 py-3 text-[15px]", className)}
    />
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: {
  label: ReactNode;
  description?: ReactNode;
} & ComponentPropsWithoutRef<"input">) {
  const id = useId();
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        {...props}
        className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md accent-primary-600"
      />
      <label htmlFor={id} className="cursor-pointer text-sm text-ink-800">
        <span className="font-semibold">{label}</span>
        {description ? (
          <span className="block text-ink-600">{description}</span>
        ) : null}
      </label>
    </div>
  );
}

export function RadioCard({
  label,
  description,
  icon,
  badge,
  className,
  ...props
}: {
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
} & ComponentPropsWithoutRef<"input">) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type="radio"
        {...props}
        className="peer absolute h-0 w-0 opacity-0"
      />
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-1.5 sm:gap-2 rounded-2xl bg-ink-100 p-3 transition whitespace-nowrap",
          "hover:bg-ink-200/70 peer-checked:bg-primary-50 peer-checked:ring-2 peer-checked:ring-primary-500",
          "peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary-600",
          "peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
          "peer-checked:[&_[data-dot]]:ring-[5px] peer-checked:[&_[data-dot]]:ring-primary-600",
        )}
      >
        {icon ? (
          <span
            className="mt-0.5 shrink-0 text-lg text-ink-700"
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-display font-bold text-ink-900 text-xs sm:text-sm">
              {label}
            </span>
            {badge}
          </span>
          {description ? (
            <span className="mt-0.5 block text-sm text-ink-600">
              {description}
            </span>
          ) : null}
        </span>
        <span
          data-dot=""
          aria-hidden="true"
          className="mt-0.5 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 rounded-full bg-white ring-2 ring-inset ring-ink-300 transition-all"
        />
      </label>
    </div>
  );
}
