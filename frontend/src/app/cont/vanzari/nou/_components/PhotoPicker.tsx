"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { FadeImage } from "@/components/ui";
import { AUCTION, IMAGE, USE_MOCK } from "@/lib/config";
import { ImageRejected, processImage } from "@/lib/images/process";
import type { ProcessedImage } from "@/lib/images/process";
import { cn } from "@/lib/utils/cn";

const ACCEPT = "image/jpeg,image/png,image/webp";

const DRAG_AFTER_PX = 8;

const HOLD_MS = 280;

const HOLD_SLOP_PX = 10;

const CARD =
  "relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-2xl sm:w-28";

const CARD_HEIGHT = "h-32 sm:h-[9.3333rem]";

const SETTINGS = USE_MOCK
  ? { maxEdge: IMAGE.DEMO_MAX_EDGE_PX, quality: IMAGE.DEMO_QUALITY }
  : { maxEdge: IMAGE.MAX_EDGE_PX, quality: IMAGE.QUALITY };

export function PhotoPicker({
  value,
  onChange,
}: {
  value: ProcessedImage[];
  onChange: (next: ProcessedImage[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const [working, setWorking] = useState(0);
  const [fileOver, setFileOver] = useState(false);
  const [dragged, setDragged] = useState<number | null>(null);
  const [holding, setHolding] = useState<number | null>(null);
  const from = useRef({ x: 0, y: 0 });
  const holdTimer = useRef<number | null>(null);
  const loose = useRef(false);

  const held = useRef<ProcessedImage[]>([]);
  useEffect(() => {
    held.current = value;
  });

  useEffect(() => () => held.current.forEach((photo) => photo.release()), []);

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = AUCTION.MAX_IMAGES - value.length - working;
    const picked = Array.from(files).slice(0, Math.max(0, room));
    if (!picked.length) return;

    setRefused(null);
    setWorking((count) => count + picked.length);

    for (const file of picked) {
      try {
        const photo = await processImage(file, SETTINGS);
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
    const row = rowRef.current;
    if (!row || value.length === 0) return;
    row.scrollTo({ left: row.scrollWidth, behavior: "smooth" });
  }, [value.length, working]);

  const cancelHold = () => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHolding(null);
  };

  useEffect(() => {
    if (holding === null) return;

    const wander = (event: PointerEvent) => {
      const travelled = Math.hypot(
        event.clientX - from.current.x,
        event.clientY - from.current.y,
      );
      if (travelled > HOLD_SLOP_PX) cancelHold();
    };

    window.addEventListener("pointermove", wander, { passive: true });
    window.addEventListener("pointerup", cancelHold);
    window.addEventListener("pointercancel", cancelHold);
    window.addEventListener("scroll", cancelHold, {
      passive: true,
      capture: true,
    });
    return () => {
      window.removeEventListener("pointermove", wander);
      window.removeEventListener("pointerup", cancelHold);
      window.removeEventListener("pointercancel", cancelHold);
      window.removeEventListener("scroll", cancelHold, { capture: true });
    };
  }, [holding]);

  useEffect(() => {
    if (dragged === null) return;

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

      const row = rowRef.current;
      if (row) {
        const box = row.getBoundingClientRect();
        const EDGE = 56;
        if (event.clientX > box.right - EDGE) row.scrollLeft += 12;
        else if (event.clientX < box.left + EDGE) row.scrollLeft -= 12;
      }

      const to = cardUnder(event.clientX, event.clientY);
      if (to === null || to === dragged) return;

      const next = [...value];
      const [moved] = next.splice(dragged, 1);
      next.splice(to, 0, moved!);
      onChange(next);
      setDragged(to);
    };

    const swallow = (event: TouchEvent) => event.preventDefault();

    const drop = () => {
      loose.current = false;
      setDragged(null);
    };

    window.addEventListener("pointermove", follow);
    window.addEventListener("touchmove", swallow, { passive: false });
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", drop);
    return () => {
      window.removeEventListener("pointermove", follow);
      window.removeEventListener("touchmove", swallow);
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
  const empty = value.length === 0 && working === 0;

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={rowRef}
        className={cn(
          "-mx-1.5 -my-1.5 flex gap-2 overflow-x-auto overscroll-x-contain p-1.5",
          "no-scrollbar",
        )}
      >
        {empty ? (
          <div
            onDragOver={overFiles}
            onDragLeave={() => setFileOver(false)}
            onDrop={dropFiles}
            className={cn(
              "flex w-full shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-dashed transition-colors",
              CARD_HEIGHT,
              fileOver ? "border-primary-500" : "border-ink-300",
            )}
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border-[1.5px] border-ink-300 bg-white px-4 py-2.5",
                "font-display text-sm font-extrabold text-ink-800 transition-colors",
                "hover:border-primary-400 hover:text-primary-700",
              )}
            >
              <Icons.add aria-hidden="true" className="h-4 w-4 shrink-0" />
              Adaugă fotografii
            </button>
          </div>
        ) : null}

        {value.map((photo, index) => (
          <div
            key={photo.previewUrl}
            data-photo={index}
            className={cn(
              CARD,
              "group bg-ink-100 ring-1 transition select-none [-webkit-touch-callout:none]",
              index === 0 ? "ring-primary-500" : "ring-edge",
              dragged === index && "cursor-grabbing opacity-60",
              dragged !== index && "cursor-grab",
              holding === index && "scale-95",
            )}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse") {
                if (event.button !== 0) return;
                event.preventDefault();
                from.current = { x: event.clientX, y: event.clientY };
                loose.current = false;
                setDragged(index);
                return;
              }

              from.current = { x: event.clientX, y: event.clientY };
              setHolding(index);
              holdTimer.current = window.setTimeout(() => {
                holdTimer.current = null;
                setHolding(null);
                loose.current = true;
                setDragged(index);
              }, HOLD_MS);
            }}
          >
            <FadeImage src={photo.previewUrl} sizes="112px" />

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

        {Array.from({ length: working }, (_, index) => (
          <div
            key={`working-${index}`}
            className={cn(CARD, "shimmer bg-ink-100 ring-1 ring-edge")}
          />
        ))}

        {full || empty ? null : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={overFiles}
            onDragLeave={() => setFileOver(false)}
            onDrop={dropFiles}
            aria-label="Adaugă fotografii"
            className={cn(
              CARD,
              "flex flex-col items-center justify-center gap-1 border-[1.5px] border-dashed transition",
              fileOver
                ? "border-primary-500 text-ink-700"
                : "border-ink-300 text-ink-500 hover:border-primary-400 hover:bg-white",
            )}
          >
            <Icons.add aria-hidden="true" className="h-5 w-5" />
            <span className="text-[11px] font-bold">Adaugă</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={(event) => void add(event.target.files)}
        className="sr-only"
      />

      <p
        aria-hidden={empty}
        className={cn(
          "min-h-4 text-center text-xs text-ink-500 transition-opacity duration-200",
          empty ? "opacity-0" : "opacity-100",
        )}
      >
        Trage fotografiile pentru a schimba ordinea.
      </p>

      {refused ? (
        <p role="alert" className="text-sm font-semibold text-danger-600">
          {refused}
        </p>
      ) : null}
    </div>
  );
}
