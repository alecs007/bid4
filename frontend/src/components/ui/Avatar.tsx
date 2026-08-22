import Image from "next/image";
import { LuCheck } from "react-icons/lu";

import { Icons } from "@/components/icons";

import { cn } from "@/lib/utils/cn";
import type { AccountType } from "@/lib/types";

const SIZES = {
  xs: "h-7 w-7 text-[11px]",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
} as const;

const PX = { xs: 28, sm: 36, md: 44, lg: 64, xl: 96 } as const;

export type AvatarSize = keyof typeof SIZES;

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function Avatar({
  name,
  src,
  size = "md",
  accountType,
  verified = false,
  className,
}: {
  name: string;
  src?: string;
  size?: AvatarSize;
  accountType?: AccountType;
  verified?: boolean;
  className?: string;
}) {
  const isOrg = accountType === "ORGANIZATION";

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center overflow-hidden bg-primary-100 font-display font-extrabold text-primary-900 ring-2 ring-white",
          isOrg ? "rounded-2xl" : "rounded-full",
          SIZES[size],
        )}
      >
        {src ? (
          <Image
            src={src}
            alt=""
            width={PX[size]}
            height={PX[size]}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : isOrg ? (
          <Icons.organization aria-hidden="true" className="h-1/2 w-1/2" />
        ) : (
          <span aria-hidden="true">{initials(name)}</span>
        )}
      </span>

      {verified ? (
        <span
          title="Organizator verificat"
          className="absolute -right-1 -bottom-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-success-600 text-white ring-2 ring-white"
        >
          <LuCheck aria-hidden="true" className="h-3 w-3" strokeWidth={4} />
          <span className="sr-only">Verificat</span>
        </span>
      ) : null}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 4,
  size = "sm",
}: {
  people: { name: string; avatarUrl?: string }[];
  max?: number;
  size?: AvatarSize;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;

  return (
    <div className="flex items-center">
      <div className="flex -space-x-2">
        {shown.map((person) => (
          <Avatar
            key={person.name}
            name={person.name}
            src={person.avatarUrl}
            size={size}
          />
        ))}
      </div>
      {rest > 0 ? (
        <span className="ml-2 text-sm font-semibold text-ink-600">+{rest}</span>
      ) : null}
    </div>
  );
}
