"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { FadeImage } from "@/components/ui";
import { CARD_MEDIA } from "@/components/auctions/cardChrome";
import { AUCTION, IMAGE, USE_MOCK } from "@/lib/config";
import { ImageRejected, processImage } from "@/lib/images/process";
import type { ProcessedImage } from "@/lib/images/process";
import { cn } from "@/lib/utils/cn";

const ACCEPT = "image/jpeg,image/png,image/webp";

/** How far a finger travels before a press on a photograph becomes a drag rather than a tap. */
const DRAG_AFTER_PX = 8;

/** Smaller copies where the only place to put them is the browser's own storage. */
const SETTINGS = USE_MOCK
  ? { maxEdge: IMAGE.DEMO_MAX_EDGE_PX, quality: IMAGE.DEMO_QUALITY }
  : { maxEdge: IMAGE.MAX_EDGE_PX, quality: IMAGE.QUALITY };

/**
 * One wide target until there is something to show, then the photographs themselves.
 *
 * <p>A row of empty outlines asked the seller to fill four boxes before they had decided how many
 * photographs to take. The empty state is one area instead: it takes a drop as readily as a click,
 * and it says which files it accepts, which is the only thing a seller cannot guess.
 *
 * <p>Order is the whole interface once they arrive. The first is the cover, and it is made the
 * cover by being dragged to the front — a "fă copertă" button on every card was a second way to
 * say what the position already says. The drag is followed on the window rather than through
 * `setPointerCapture`, which throws when the pointer has already gone and leaves a card stuck to
 * the finger.
 *
 * <p>What each card shows is not the file that was chosen. Every photograph is decoded, turned the
 * way it was taken, scaled down and encoded again the moment it lands here, and the preview is
 * those bytes — so what a seller approves is what is uploaded, and a picture that will not survive
 * the trip is refused while they are still looking at the form rather than after they submit it.
 */
export function PhotoPicker({
  value,
  onChange,
}: {
  value: ProcessedImage[];
  onChange: (next: ProcessedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [refused, setRefused] = useState<string | null>(null);
  /** How many are still being decoded, drawn as cards so the row keeps its shape. */
  const [working, setWorking] = useState(0);
  const [fileOver, setFileOver] = useState(false);
  const [dragged, setDragged] = useState<number | null>(null);
  const from = useRef({ x: 0, y: 0 });
  /** True once the press has travelled far enough to be a drag and not a tap. */
  const loose = useRef(false);

  // What is currently held, kept where the loop below can see it across its
  // awaits — `value` there is whatever it was when the drop happened.
  const held = useRef<ProcessedImage[]>([]);
  useEffect(() => {
    held.current = value;
  });

  // And given back when the form goes. Each one is bytes the tab holds on to
  // until the object URL behind it is revoked.
  useEffect(() => () => held.current.forEach((photo) => photo.release()), []);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = AUCTION.MAX_IMAGES - value.length - working;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (!picked.length) return;

    setRefused(null);
    setWorking((count) => count + picked.length);

    // One at a time. A phone photograph decodes into tens of megabytes of
    // canvas, and eight of them at once is how a browser tab runs out of memory
    // on the device most likely to be doing this.
    for (const file of picked) {
      try {
        const photo = await processImage(file, SETTINGS);
        // Read through the ref rather than the closure: this loop spans several
        // awaits, and `value` is whatever it was when the drop happened.
        onChange([...held.current, photo]);
      } catch (error) {
        setRefused(
          error instanceof ImageRejected
            ? error.message
            : "O fotografie nu a putut fi adăugată.",
        );
      } finally {
        setWorking((count) => Math.max(0, count - 1));
      }
    }

    if (inputRef.current) inputRef.current.value = "";
  };

  const remove = (index: number) => {
    value[index]?.release();
    onChange(value.filter((_, position) => position !== index));
  };

  useEffect(() => {
    if (dragged === null) return;

    /** The card the pointer is over, by the index each one carries. */
    const cardUnder = (x: number, y: number): number | null => {
      const element = document.elementFromPoint(x, y)?.closest("[data-photo]");
      if (!element) return null;
      const index = Number((element as HTMLElement).dataset.photo);
      return Number.isNaN(index) ? null : index;
    };

    const follow = (event: PointerEvent) => {
      if (!loose.current) {
        const travelled = Math.hypot(
          event.clientX - from.current.x,
          event.clientY - from.current.y,
        );
        if (travelled < DRAG_AFTER_PX) return;
        loose.current = true;
      }

      const to = cardUnder(event.clientX, event.clientY);
      if (to === null || to === dragged) return;

      const next = [...value];
      const [moved] = next.splice(dragged, 1);
      next.splice(to, 0, moved!);
      onChange(next);
      setDragged(to);
    };

    const drop = () => {
      loose.current = false;
      setDragged(null);
    };

    window.addEventListener("pointermove", follow);
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", drop);
    return () => {
      window.removeEventListener("pointermove", follow);
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", drop);
    };
  }, [dragged, value, onChange]);

  const dropFiles = (event: React.DragEvent) => {
    event.preventDefault();
    setFileOver(false);
    void add(event.dataTransfer.files);
  };

  const overFiles = (event: React.DragEvent) => {
    event.preventDefault();
    setFileOver(true);
  };

  const full = value.length + working >= AUCTION.MAX_IMAGES;

  return (
    <div className="flex flex-col gap-2">
      {value.length === 0 && working === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={overFiles}
          onDragLeave={() => setFileOver(false)}
          onDrop={dropFiles}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition",
            fileOver
              ? "border-primary-500 bg-primary-50"
              : "border-ink-200 bg-canvas hover:border-ink-300 hover:bg-white",
          )}
        >
          <Icons.photo
            aria-hidden="true"
            className={cn(
              "h-8 w-8 transition",
              fileOver ? "text-primary-600" : "text-ink-400",
            )}
          />
          <span className="font-display text-sm font-extrabold text-ink-900">
            Adaugă fotografii
          </span>
          <span className="text-xs text-ink-500">
            JPG, PNG sau WEBP, până la {IMAGE.MAX_INPUT_MB} MB fiecare
          </span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {value.map((photo, index) => (
            <div
              key={photo.previewUrl}
              data-photo={index}
              // touch-none so the first finger movement picks the card up rather
              // than scrolling the page, and select-none with the callout off so
              // a press does not start selecting the picture instead.
              className={cn(
                CARD_MEDIA,
                "group touch-none bg-ink-100 ring-1 transition-opacity select-none [-webkit-touch-callout:none]",
                index === 0 ? "ring-primary-500" : "ring-edge",
                dragged === index
                  ? "cursor-grabbing opacity-60"
                  : "cursor-grab",
              )}
              onPointerDown={(event) => {
                if (event.pointerType === "mouse" && event.button !== 0) return;
                event.preventDefault();
                from.current = { x: event.clientX, y: event.clientY };
                loose.current = false;
                setDragged(index);
              }}
            >
              <FadeImage
                src={photo.previewUrl}
                sizes="(max-width: 640px) 33vw, 25vw"
              />

              <button
                type="button"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => remove(index)}
                aria-label={`Șterge fotografia ${index + 1}`}
                className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/95 text-ink-600 transition hover:text-danger-700"
              >
                <Icons.close aria-hidden="true" className="h-3.5 w-3.5" />
              </button>

              {index === 0 ? (
                <span className="absolute inset-x-1 bottom-1 rounded-md bg-white/95 py-0.5 text-center text-[10px] font-bold text-primary-800">
                  Copertă
                </span>
              ) : null}
            </div>
          ))}

          {/* A card each for the ones still being prepared, so the row grows as
              they are chosen instead of after the last one is ready. */}
          {Array.from({ length: working }, (_, index) => (
            <div
              key={`working-${index}`}
              className={cn(CARD_MEDIA, "shimmer bg-ink-100 ring-1 ring-edge")}
            />
          ))}

          {full ? null : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={overFiles}
              onDragLeave={() => setFileOver(false)}
              onDrop={dropFiles}
              aria-label="Adaugă fotografii"
              className={cn(
                CARD_MEDIA,
                "flex flex-col items-center justify-center gap-1 border-2 border-dashed transition",
                fileOver
                  ? "border-ink-400 bg-white text-ink-700"
                  : "border-ink-200 bg-canvas text-ink-500 hover:border-ink-300 hover:bg-white",
              )}
            >
              <Icons.add aria-hidden="true" className="h-5 w-5" />
              <span className="text-[11px] font-bold">Adaugă</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={(event) => void add(event.target.files)}
        className="sr-only"
      />

      {refused ? (
        <p role="alert" className="text-sm font-semibold text-danger-600">
          {refused}
        </p>
      ) : null}
    </div>
  );
}
