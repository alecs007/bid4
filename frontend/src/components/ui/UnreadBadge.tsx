import { cn } from "@/lib/utils/cn";

const SIZES = {
  xs: "h-3 min-w-3 text-[9px]/none",
  sm: "h-5 min-w-5 text-[11px]/none",
} as const;

export type UnreadBadgeSize = keyof typeof SIZES;

export function UnreadBadge({
  count,
  size = "sm",
  max,
  tone,
  className,
  ...rest
}: {
  count: number;
  size?: UnreadBadgeSize;
  max?: number;
  tone: string;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<"span">, "children">) {
  if (count < 1) return null;

  const shown = max !== undefined && count > max ? `${max}+` : String(count);

  return (
    <span
      className={cn(
        "numeric inline-flex shrink-0 items-center justify-center rounded-full",
        "font-sans font-extrabold",
        SIZES[size],
        shown.length > 1 && (size === "xs" ? "px-0.5" : "px-1.5"),
        tone,
        className,
      )}
      {...rest}
    >
      {shown}
    </span>
  );
}
