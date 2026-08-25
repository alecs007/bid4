import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode, Ref } from "react";
import { Icons } from "@/components/icons";

import { cn } from "@/lib/utils/cn";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "sky"
  | "sun"
  | "danger"
  | "secondary"
  | "ghost"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "xl";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary-600 text-white [--btn-edge:var(--color-primary-800)] hover:bg-primary-700",
  accent:
    "bg-accent-600 text-white [--btn-edge:var(--color-accent-800)] hover:bg-accent-700",
  sky: "bg-sky-600 text-white [--btn-edge:var(--color-sky-800)] hover:bg-sky-700",
  sun: "bg-sun-400 text-ink-900 [--btn-edge:var(--color-sun-600)] hover:bg-sun-300",
  danger:
    "bg-danger-600 text-white [--btn-edge:var(--color-danger-700)] hover:bg-danger-700",
  secondary:
    "bg-white text-ink-900 ring-2 ring-inset ring-ink-200 [--btn-edge:var(--color-ink-200)] hover:bg-ink-50",
  ghost:
    "bg-transparent text-ink-700 [--btn-depth:0px] hover:bg-ink-100 hover:text-ink-900",
  link: "bg-transparent text-primary-700 underline decoration-2 underline-offset-4 [--btn-depth:0px] hover:text-primary-800 px-0",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 gap-1.5 px-3 text-sm sm:px-4 [--btn-depth:3px]",
  md: "h-11 gap-2 px-4 text-[15px] sm:px-5",
  lg: "h-13 gap-2.5 px-5 text-base sm:px-7",
  xl: "h-15 gap-3 px-7 text-lg sm:px-9 [--btn-depth:5px]",
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: "h-9 w-9 p-0",
  md: "h-11 w-11 p-0",
  lg: "h-13 w-13 p-0",
  xl: "h-15 w-15 p-0",
};

const BASE =
  "btn-3d relative inline-flex select-none items-center justify-center rounded-2xl font-display font-extrabold tracking-wide whitespace-nowrap " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  iconOnly?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

function buildClassName({
  variant = "primary",
  size = "md",
  fullWidth,
  iconOnly,
  className,
}: CommonProps): string {
  return cn(
    BASE,
    VARIANTS[variant],
    iconOnly ? cn(SIZES[size], ICON_SIZES[size]) : SIZES[size],
    fullWidth && "w-full",
    className,
  );
}

function Content({
  loading,
  leftIcon,
  rightIcon,
  children,
}: Pick<CommonProps, "loading" | "leftIcon" | "rightIcon" | "children">) {
  return (
    <>
      {loading ? (
        <Icons.loading className="h-[1.15em] w-[1.15em] shrink-0 animate-spin" />
      ) : (
        leftIcon
      )}
      {children}
      {rightIcon}
    </>
  );
}

export interface ButtonProps
  extends CommonProps,
    Omit<ComponentPropsWithoutRef<"button">, "children" | "className"> {
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant,
  size,
  fullWidth,
  iconOnly,
  loading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      className={buildClassName({ variant, size, fullWidth, iconOnly, className })}
      {...props}
    >
      <Content loading={loading} leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </Content>
    </button>
  );
}

export interface ButtonLinkProps
  extends CommonProps,
    Omit<ComponentPropsWithoutRef<typeof Link>, "children" | "className"> {}

export function ButtonLink({
  variant,
  size,
  fullWidth,
  iconOnly,
  loading,
  leftIcon,
  rightIcon,
  children,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buildClassName({ variant, size, fullWidth, iconOnly, className })}
      {...props}
    >
      <Content loading={loading} leftIcon={leftIcon} rightIcon={rightIcon}>
        {children}
      </Content>
    </Link>
  );
}
