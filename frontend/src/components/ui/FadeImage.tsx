"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

export function FadeImage({
  src,
  sizes,
  alt = "",
  className,
}: {
  src: string;
  sizes: string;
  alt?: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [instant, setInstant] = useState(false);

  return (
    <>
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-ink-100",
          !instant &&
            "transition-opacity duration-300 ease-[var(--ease-out-soft)]",
          loaded ? "opacity-0" : "shimmer opacity-100",
        )}
      />
      <Image
        ref={(node) => {
          if (!node) return;
          if (node.complete) {
            setLoaded(true);
            setInstant(true);
            return;
          }
          const done = () => setLoaded(true);
          node.addEventListener("load", done);
          node.addEventListener("error", done);
          return () => {
            node.removeEventListener("load", done);
            node.removeEventListener("error", done);
          };
        }}
        src={src}
        alt={alt}
        fill
        unoptimized
        loading="eager"
        sizes={sizes}
        draggable={false}
        className={cn(
          "object-cover",
          !instant &&
            "transition-opacity duration-300 ease-[var(--ease-out-soft)]",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
}
