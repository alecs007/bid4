import type { IconType } from "react-icons";
import {
  LuBird,
  LuBug,
  LuCat,
  LuDog,
  LuFish,
  LuRabbit,
  LuRat,
  LuShell,
  LuSnail,
  LuSquirrel,
  LuTurtle,
} from "react-icons/lu";

import { cn } from "@/lib/utils/cn";

const ANIMALS: IconType[] = [
  LuBird,
  LuCat,
  LuDog,
  LuFish,
  LuRabbit,
  LuSquirrel,
  LuTurtle,
  LuSnail,
  LuRat,
  LuBug,
  LuShell,
];

const PALETTES = [
  "bg-primary-100 text-primary-700",
  "bg-sky-100 text-sky-700",
  "bg-sun-100 text-sun-700",
  "bg-accent-100 text-accent-700",
  "bg-success-100 text-success-700",
  "bg-ink-100 text-ink-700",
];

const SIZES = {
  xs: "h-7 w-7 [&>svg]:h-4 [&>svg]:w-4",
  sm: "h-9 w-9 [&>svg]:h-5 [&>svg]:w-5",
} as const;

function hash(seed: string): number {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index++) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  value ^= value >>> 16;
  value = Math.imul(value, 0x85ebca6b);
  value ^= value >>> 13;
  value = Math.imul(value, 0xc2b2ae35);
  value ^= value >>> 16;
  return value >>> 0;
}

export function anonName(seed: string): string {
  return `Ofertant #${1000 + (Math.floor(hash(seed) / 7) % 9000)}`;
}

export function AnonAvatar({
  seed,
  size = "sm",
  className,
}: {
  seed: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const value = hash(seed);
  const Animal = ANIMALS[value % ANIMALS.length]!;
  const palette = PALETTES[Math.floor(value / ANIMALS.length) % PALETTES.length];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        SIZES[size],
        palette,
        className,
      )}
    >
      <Animal
        className="animate-sway"
        style={{ animationDelay: `-${value % 2800}ms` }}
      />
    </span>
  );
}
