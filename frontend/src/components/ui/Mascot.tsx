import { cn } from "@/lib/utils/cn";

export type MascotMood = "happy" | "cheer" | "sad" | "thinking";

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
  const ink = "#14401a";

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
      <path
        d="M60 30 C60 20 62 12 67 6"
        stroke="#2f7a14"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      <ellipse
        cx="76"
        cy="8"
        rx="12"
        ry="7"
        fill="#7fda3e"
        transform="rotate(-24 76 8)"
      />
      <path
        d="M60 108 C18 80 6 56 6 40 C6 21 20 9 37 9 C48 9 56 15 60 24 C64 15 72 9 83 9 C100 9 114 21 114 40 C114 56 102 80 60 108 Z"
        fill="#58cc02"
      />
      <path
        d="M37 9 C20 9 6 21 6 40 C6 46 8 53 12 61 C10 44 16 26 37 21 Z"
        fill="#7fda3e"
      />
      <ellipse cx="33" cy="66" rx="7" ry="5" fill="#ff9e85" opacity="0.85" />
      <ellipse cx="87" cy="66" rx="7" ry="5" fill="#ff9e85" opacity="0.85" />

      
      {mood === "cheer" ? (
        <>
          <path
            d="M36 50 Q44 41 52 50"
            stroke={ink}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M68 50 Q76 41 84 50"
            stroke={ink}
            strokeWidth="6"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          <ellipse cx="44" cy="48" rx="7" ry="8" fill={ink} />
          <ellipse cx="76" cy="48" rx="7" ry="8" fill={ink} />
          <circle cx="41.5" cy="45" r="2.6" fill="#ffffff" />
          <circle cx="73.5" cy="45" r="2.6" fill="#ffffff" />
        </>
      )}

      
      {mood === "thinking" ? (
        <path
          d="M68 34 L86 30"
          stroke={ink}
          strokeWidth="4"
          strokeLinecap="round"
        />
      ) : null}

      
      {mood === "sad" ? (
        <path
          d="M50 76 Q60 68 70 76"
          stroke={ink}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      ) : mood === "cheer" ? (
        <path d="M46 64 Q60 84 74 64 Z" fill={ink} />
      ) : (
        <path
          d="M48 66 Q60 79 72 66"
          stroke={ink}
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}
