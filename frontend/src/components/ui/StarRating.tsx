import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils/cn";

const STARS = 5;

export function StarRating({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const label = `${value.toFixed(1).replace(".", ",")} din ${STARS} stele`;

  return (
    <span
      role="img"
      aria-label={label}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {Array.from({ length: STARS }, (_, index) => {
        const fill = Math.min(1, Math.max(0, value - index));
        return (
          <span key={index} className="relative inline-block h-4 w-4 shrink-0">
            <Icons.rating
              aria-hidden="true"
              className="absolute inset-0 h-4 w-4 fill-current text-ink-200"
            />
            <span
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Icons.rating
                aria-hidden="true"
                className="h-4 w-4 max-w-none fill-current text-sun-500"
              />
            </span>
          </span>
        );
      })}
    </span>
  );
}
