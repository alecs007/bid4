"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { CARD_MEDIA } from "@/components/auctions/cardChrome";
import { AUCTION, CAUSE } from "@/lib/config";
import { toFileRef } from "@/lib/mock/uploads";
import type { UploadedFileRef } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * A row of slots, so the set reads as a set.
 *
 * <p>One button saying "adaugă" told the seller nothing about how many were wanted. Four outlines
 * do, and they grow to eight as the photographs arrive rather than standing there empty: the
 * affordance is worth the space, a wall of unused boxes is not.
 *
 * <p>They are the card's own 3/4 box, imported rather than copied, so what the seller frames here
 * is the shape a reader sees in a grid. The first carries the cover ring.
 */
export function PhotoPicker({
  value,
  onChange,
}: {
  value: UploadedFileRef[];
  onChange: (next: UploadedFileRef[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tooLarge, setTooLarge] = useState<string | null>(null);

  const add = (files: FileList | null) => {
    if (!files?.length) return;
    const room = AUCTION.MAX_IMAGES - value.length;
    const picked = Array.from(files).slice(0, room);
    const small = picked.filter(
      (file) => file.size <= CAUSE.MAX_UPLOAD_MB * 1024 * 1024,
    );
    setTooLarge(
      small.length === picked.length
        ? null
        : `Unele fotografii depășesc ${CAUSE.MAX_UPLOAD_MB} MB.`,
    );
    if (small.length) onChange([...value, ...small.map(toFileRef)]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (index: number) =>
    onChange(value.filter((_, position) => position !== index));

  /** Promotion, not a swap: the order of the rest is the seller's too. */
  const makeCover = (index: number) =>
    onChange([
      value[index]!,
      ...value.filter((_, position) => position !== index),
    ]);

  const next = value.length;
  // Four while it is empty, then one spare ahead of whatever has been added.
  const shown = Math.min(AUCTION.MAX_IMAGES, Math.max(4, next + 1));
  const slots = Array.from({ length: shown }, (_, index) => index);

  return (
    <div>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {slots.map((index) => {
          const photo = value[index];
          const cover = index === 0;

          if (!photo) {
            const isNext = index === next;
            return (
              <button
                key={index}
                type="button"
                onClick={() => inputRef.current?.click()}
                aria-label={
                  isNext ? "Adaugă fotografii" : `Slot ${index + 1}, gol`
                }
                tabIndex={isNext ? 0 : -1}
                className={cn(
                  CARD_MEDIA,
                  "flex flex-col items-center justify-center gap-1 ring-1 ring-dashed transition",
                  isNext
                    ? "bg-white text-ink-600 ring-ink-300 hover:bg-primary-50 hover:text-primary-800 hover:ring-primary-400"
                    : "bg-canvas text-ink-300 ring-edge",
                )}
              >
                <Icons.add aria-hidden="true" className="h-5 w-5" />
              </button>
            );
          }

          return (
            <div
              key={photo.fileRef}
              className={cn(
                CARD_MEDIA,
                "group bg-ink-100 ring-1",
                cover ? "ring-1 ring-primary-500" : "ring-edge",
              )}
            >
              {photo.previewUrl ? (
                <Image
                  src={photo.previewUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="(max-width: 640px) 66vw, 50vw"
                  className="object-cover"
                  draggable={false}
                />
              ) : null}

              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Șterge fotografia ${index + 1}`}
                className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-ink-600 transition hover:text-danger-700"
              >
                <Icons.close aria-hidden="true" className="h-3.5 w-3.5" />
              </button>

              {cover ? (
                <span className="absolute inset-x-1 bottom-1 rounded-md bg-white/95 py-0.5 text-center text-[10px] font-bold text-primary-800">
                  Copertă
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeCover(index)}
                  aria-label={`Fă fotografia ${index + 1} copertă`}
                  className="absolute inset-x-1 bottom-1 rounded-md bg-white/95 py-0.5 text-center text-[10px] font-bold text-ink-700 opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"
                >
                  Copertă
                </button>
              )}
            </div>
          );
        })}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={(event) => add(event.target.files)}
        className="sr-only"
      />

      {tooLarge ? (
        <p role="alert" className="mt-1 text-sm font-semibold text-danger-600">
          {tooLarge}
        </p>
      ) : null}
    </div>
  );
}
