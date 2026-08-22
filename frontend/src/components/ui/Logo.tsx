import Link from "next/link";

import { cn } from "@/lib/utils/cn";

export function LogoMark({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <rect width="40" height="40" rx="12" fill="#58cc02" />
      <path
        d="M20 32 C10.5 25.5 7 20.5 7 16.5 C7 12.4 10 9.5 13.8 9.5 C16.2 9.5 18.6 10.9 20 13 C21.4 10.9 23.8 9.5 26.2 9.5 C30 9.5 33 12.4 33 16.5 C33 20.5 29.5 25.5 20 32 Z"
        fill="#ffffff"
      />
      <path
        d="M20 13.5 C20 10.5 21.5 8 24 6.5"
        stroke="#2f7a14"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse
        cx="27.5"
        cy="6.5"
        rx="4.6"
        ry="2.8"
        fill="#ffffff"
        transform="rotate(-24 27.5 6.5)"
      />
    </svg>
  );
}

export function Logo({
  size = "md",
  href = "/",
  className,
}: {
  size?: "sm" | "md" | "lg";
  href?: string | null;
  className?: string;
}) {
  const marks = { sm: 26, md: 32, lg: 44 } as const;
  const text = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-3xl",
  } as const;

  const content = (
    <>
      <LogoMark size={marks[size]} />
      <span
        className={cn(
          "font-display font-extrabold tracking-tight text-ink-900",
          text[size],
        )}
      >
        bid<span className="text-accent-600">4</span>
      </span>
    </>
  );

  if (href === null) {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label="bid4, pagina principală"
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl transition hover:opacity-90",
        className,
      )}
    >
      {content}
    </Link>
  );
}
