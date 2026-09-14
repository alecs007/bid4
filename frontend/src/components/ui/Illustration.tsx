import Image from "next/image";

import { cn } from "@/lib/utils/cn";

export function Illustration({
  src,
  className,
  sizes = "16px",
  alt = "",
}: {
  src: string;
  className?: string;
  sizes?: string;
  alt?: string;
}) {
  return (
    <span
      aria-hidden={alt ? undefined : "true"}
      className={cn("relative block shrink-0 overflow-hidden", className)}
    >
      <Image
        src={`/images/illustrations/${src}.webp`}
        alt={alt}
        fill
        sizes={sizes}
        unoptimized
        loading="eager"
        fetchPriority="high"
        className="scale-[1.04] object-contain"
        draggable={false}
      />
    </span>
  );
}

export type IconSet = "categories" | "causes";

export function CategoryIcon({
  set,
  id,
  ...rest
}: {
  set: IconSet;
  id: string;
  className?: string;
  sizes?: string;
  alt?: string;
}) {
  return <Illustration src={`${set}/${id}`} {...rest} />;
}
