import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";

/** The lockup carries ~10% empty canvas, so the box is drawn taller than it reads. */
const HEIGHTS = { sm: 33, md: 40, lg: 55 } as const;
const LOGO_RATIO = 1024 / 426;

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
      <path d="M19.6 11.6 Q20.5 4.5 27.6 3.6 Q26.7 10.7 19.6 11.6 Z" fill="#ffffff" />
      <path
        d="M20 34.4 C13.6 29.4 7.8 24.4 7.8 19.2 C7.8 14.9 10.4 12.3 13.8 12.3 C16.6 12.3 18.8 13.6 20 15.6 C21.2 13.6 23.4 12.3 26.2 12.3 C29.6 12.3 32.2 14.9 32.2 19.2 C32.2 24.4 26.4 29.4 20 34.4 Z"
        fill="#ffffff"
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
  const height = HEIGHTS[size];

  const content = (
    <Image
      src="/images/logo.webp"
      alt="bid4"
      width={Math.round(height * LOGO_RATIO)}
      height={height}
      priority
      // The file is an SVG, which the image optimizer refuses to touch.
      unoptimized
    />
  );

  if (href === null) {
    return (
      <span className={cn("inline-flex items-center", className)}>
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label="bid4, pagina principală"
      className={cn(
        "inline-flex items-center rounded-2xl transition hover:opacity-90",
        className,
      )}
    >
      {content}
    </Link>
  );
}
