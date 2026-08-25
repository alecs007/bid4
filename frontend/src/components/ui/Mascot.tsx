import { cn } from "@/lib/utils/cn";

export type MascotMood = "happy" | "cheer" | "sad" | "thinking";

const INK = "#14401a";

const BROWS: Record<MascotMood, readonly [string, string]> = {
  happy: ["M40 41 Q46 37 52 40", "M80 41 Q74 37 68 40"],
  cheer: ["M39 38 Q46 33 53 37", "M81 38 Q74 33 67 37"],
  sad: ["M40 43 Q46 40 53 38", "M80 43 Q74 40 67 38"],
  thinking: ["M40 41 Q46 37 52 40", "M80 36 Q74 32 68 35"],
};

export function Mascot({
  mood = "happy",
  size = 120,
  floating = false,
  className,
  title,
}: {
  mood?: MascotMood;
  size?: number;
  floating?: boolean;
  className?: string;
  title?: string;
}) {
  const [browLeft, browRight] = BROWS[mood];

  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : "true"}
      className={cn(floating && "animate-float", className)}
    >
      <path d="M59 29 Q62.6 12.6 79 9 Q75.4 25.4 59 29 Z" fill="#7fda3e" />

      <path
        d="M60 109 C34.8 89.3 12 69.6 12 49 C12 32.2 22.2 22 35.6 22 C46.6 22 55.3 27 60 35 C64.7 27 73.4 22 84.4 22 C97.8 22 108 32.2 108 49 C108 69.6 85.2 89.3 60 109 Z"
        fill="#58cc02"
      />
      <ellipse
        cx="30"
        cy="36"
        rx="12"
        ry="7.5"
        fill="#7fda3e"
        opacity="0.55"
        transform="rotate(-30 30 36)"
      />
      <ellipse cx="31" cy="70" rx="8" ry="5" fill="#7fda3e" opacity="0.5" />
      <ellipse cx="89" cy="70" rx="8" ry="5" fill="#7fda3e" opacity="0.5" />

      <path
        d={browLeft}
        stroke={INK}
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={browRight}
        stroke={INK}
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />

      {mood === "cheer" ? (
        <>
          <path
            d="M38 58 Q46 48 54 58"
            stroke={INK}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M82 58 Q74 48 66 58"
            stroke={INK}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <ellipse cx="46" cy="56" rx="8" ry="9.5" fill={INK} />
          <ellipse cx="74" cy="56" rx="8" ry="9.5" fill={INK} />
          <circle cx="43" cy="52" r="3" fill="#ffffff" />
          <circle cx="71" cy="52" r="3" fill="#ffffff" />
        </>
      )}

      {mood === "cheer" ? (
        <path d="M45 73 Q60 95 75 73 Z" fill={INK} />
      ) : mood === "sad" ? (
        <path
          d="M48 84 Q60 74 72 84"
          stroke={INK}
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />
      ) : mood === "thinking" ? (
        <path
          d="M50 80 L68 77"
          stroke={INK}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <path
          d="M46 76 Q60 90 74 76"
          stroke={INK}
          strokeWidth="5.5"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}
