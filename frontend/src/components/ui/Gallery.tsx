"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Cover image with a thumbnail rail under it. Shared by the auction and the
 * product page, which show the same photographs from either side.
 */
export function Gallery({
  images,
  alt,
}: {
  images: string[];
  alt: string;
}) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0] ?? "";

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl bg-ink-50">
        <Image
          src={current}
          alt={alt}
          fill
          unoptimized
          priority
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div className="flex gap-3">
          {images.map((image, index) => (
            <button
              key={image}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Imaginea ${index + 1}`}
              aria-current={index === active}
              className={cn(
                "relative h-20 w-20 overflow-hidden rounded-2xl border-2 transition",
                index === active
                  ? "border-primary-500"
                  : "border-line hover:border-ink-300",
              )}
            >
              <Image
                src={image}
                alt=""
                fill
                unoptimized
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
