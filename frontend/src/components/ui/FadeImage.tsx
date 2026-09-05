"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * A photograph that arrives rather than appears.
 *
 * <p>Eager, always. These are pictures somebody has just chosen or just picked out of a row, not
 * something further down a page: lazily loaded they showed up a beat after the thing that asked
 * for them, which reads as the choice not having registered.
 *
 * <p>A pulsing ground holds the space until it decodes and the picture fades over it. The `ref`
 * catches the case the `onLoad` misses — an image already in the browser's cache can be complete
 * before React has attached the handler, and without this it would sit at nought opacity forever.
 */
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

  return (
    <>
      {/* The same shimmer every skeleton on the site uses, so a picture on its
          way in reads as loading rather than as a grey box that happens to be
          there. */}
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-ink-100 transition-opacity duration-300 ease-[var(--ease-out-soft)]",
          loaded ? "opacity-0" : "shimmer opacity-100",
        )}
      />
      <Image
        // Listened for on the element rather than through `onLoad`: an object
        // URL, or anything already in the cache, can finish before React has
        // attached its handler, and the picture then sits at nought opacity
        // under the placeholder for good. `complete` covers that race; the
        // listeners cover everything slower. Errors count as arrived, or a
        // broken file pulses for ever.
        ref={(node) => {
          if (!node) return;
          if (node.complete) {
            setLoaded(true);
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
          "object-cover transition-opacity duration-300 ease-[var(--ease-out-soft)]",
          loaded ? "opacity-100" : "opacity-0",
          className,
        )}
      />
    </>
  );
}
