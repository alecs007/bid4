"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils/cn";

import { collageStyle } from "./collage";
import { Lightbox } from "./Lightbox";

const SHOWN = 5;

export function Gallery({
  images,
  alt,
  actions,
}: {
  images: string[];
  alt: string;
  actions?: React.ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(null);

  const count = images.length;
  if (count === 0) return null;

  const shown = images.slice(0, SHOWN);
  const hidden = count - shown.length;
  const collage = collageStyle(shown.length);

  const tiles = shown.map((image, index) => (
    <Tile
      key={image}
      image={image}
      alt={index === 0 ? alt : ""}
      label={`Deschide imaginea ${index + 1} din ${count}`}
      eager={index === 0}
      sizes={index === 0 || shown.length <= 2 ? "(min-width: 1024px) 30vw, 60vw" : "(min-width: 1024px) 15vw, 30vw"}
      more={index === shown.length - 1 && hidden > 0 ? hidden : 0}
      onOpen={() => setOpen(index)}
      className={cn(
        !collage && "aspect-[3/4]",
        collage && index === 0 && "row-span-2",
        shown.length === 4 && index === 1 && "col-span-2",
      )}
    />
  ));

  return (
    <>
      <div className="@container relative">
        {actions ? (
          <div className="absolute top-3 right-3 z-10 flex gap-1.5 lg:hidden">
            {actions}
          </div>
        ) : null}

        {collage ? (
          <div className="grid gap-2" style={collage}>
            {tiles}
          </div>
        ) : count === 2 ? (
          <div className="grid grid-cols-2 gap-2">{tiles}</div>
        ) : (
          <div className="frame-empty flex justify-center rounded-2xl">
            <div className="w-1/2">{tiles}</div>
          </div>
        )}
      </div>

      {open !== null ? (
        <Lightbox
          images={images}
          alt={alt}
          startIndex={open}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </>
  );
}

function Tile({
  image,
  alt,
  label,
  eager,
  sizes,
  more,
  onOpen,
  className,
}: {
  image: string;
  alt: string;
  label: string;
  eager: boolean;
  sizes: string;
  more: number;
  onOpen: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={more ? `${label}, încă ${more}` : label}
      className={cn(
        "group relative block min-h-0 w-full cursor-zoom-in overflow-hidden rounded-2xl bg-ink-100",
        className,
      )}
    >
      <Image
        src={image}
        alt={alt}
        fill
        unoptimized
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        onLoad={(event) =>
          event.currentTarget.setAttribute("data-loaded", "true")
        }
        className="object-cover opacity-0 [transition:opacity_220ms_ease-out,scale_500ms] group-hover:scale-[1.015] data-[loaded=true]:opacity-100"
        draggable={false}
      />
      {more ? (
        <span className="absolute inset-0 flex items-center justify-center bg-ink-900/45 font-display text-2xl font-extrabold text-white transition-colors group-hover:bg-ink-900/55 sm:text-3xl">
          +{more}
        </span>
      ) : null}
    </button>
  );
}
