"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icons } from "@/components/icons";
import { setPageScrollLocked } from "@/components/layout/SmoothScroll";
import { cn } from "@/lib/utils/cn";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
/** One notch of a mouse wheel, roughly. Exponential so each notch feels equal. */
const WHEEL_SENSITIVITY = 0.0018;

interface View {
  scale: number;
  x: number;
  y: number;
}

const RESET: View = { scale: 1, x: 0, y: 0 };

/**
 * Portalled to `document.body`: the page wrapper's opacity animation makes it a
 * stacking context, so a z-index inside it cannot reach past the header.
 */
export function Lightbox({
  images,
  alt,
  startIndex,
  onClose,
}: {
  images: string[];
  alt: string;
  /** Where to open. The reader's way around in here is their own from then on. */
  startIndex: number;
  onClose: () => void;
}) {
  /**
   * Owned here rather than lifted to the gallery.
   *
   * <p>While the gallery held it, every step in this modal was also a step on
   * the page underneath — and the page's slider answers a change by animating
   * to it, reporting each slide it passes over on the way. Stepping from the
   * last picture to the first travelled the whole strip backwards and handed
   * back every index in between, so the modal appeared to rotate through the
   * others to reach its neighbour.
   */
  const [index, setIndex] = useState(startIndex);
  const [view, setView] = useState<View>(RESET);
  const [dragging, setDragging] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);

  /** Live pointers on the stage: one pans, two pinch. */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  /**
   * The drag is driven from a ref and only mirrored into state for the cursor
   * and the transition. As state alone, the first move after the press read the
   * `false` from its own tick and was dropped — which is exactly the movement a
   * quick drag is made of.
   */
  const draggingRef = useRef(false);
  const pinch = useRef<{ distance: number; scale: number } | null>(null);

  const count = images.length;
  const zoomed = view.scale > MIN_SCALE + 0.01;

  /**
   * Keeps the picture over the stage it is being viewed in.
   *
   * <p>At scale s the image is s times the stage, so there is exactly
   * (s-1)/2 of it hidden on each side — pan further than that and the reader is
   * dragging the photograph off the screen and looking at the backdrop.
   */
  const contain = useCallback((next: View): View => {
    const stage = stageRef.current;
    if (!stage) return next;
    const { width, height } = stage.getBoundingClientRect();
    const maxX = Math.max(0, ((next.scale - 1) * width) / 2);
    const maxY = Math.max(0, ((next.scale - 1) * height) / 2);
    return {
      scale: next.scale,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }, []);

  /**
   * Rescales around a point, so whatever is under the cursor or between the
   * fingers stays under them.
   */
  const scaleAround = useCallback(
    (factor: number, clientX?: number, clientY?: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const px = (clientX ?? rect.left + rect.width / 2) - rect.left - rect.width / 2;
      const py = (clientY ?? rect.top + rect.height / 2) - rect.top - rect.height / 2;

      setView((current) => {
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current.scale * factor));
        // All the way out is all the way home: an image at its own size has
        // nowhere to be panned to, so it returns to the middle rather than
        // sitting off-centre with no way to tell.
        if (scale === MIN_SCALE) return RESET;
        const k = scale / current.scale;
        return contain({
          scale,
          x: px - (px - current.x) * k,
          y: py - (py - current.y) * k,
        });
      });
    },
    [contain],
  );

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      pointers.current.clear();
      pinch.current = null;
      draggingRef.current = false;
      setDragging(false);
      setView(RESET);
      setIndex((next + count) % count);
    },
    [count],
  );

  // Mount-only: the scroll lock and the initial focus. These used to sit in the
  // same effect as the key handler, so every arrow press tore the lock down,
  // set it up again and pulled focus back to the close button.
  useEffect(() => {
    const root = document.documentElement;
    const scrollbar = window.innerWidth - root.clientWidth;
    const previous = {
      overflow: root.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };
    root.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    setPageScrollLocked(true);
    closeRef.current?.focus();

    return () => {
      root.style.overflow = previous.overflow;
      document.body.style.paddingRight = previous.paddingRight;
      setPageScrollLocked(false);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === "0") setView(RESET);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [go, index, onClose]);

  // Native and non-passive, because a wheel that zooms has to be a wheel that
  // does not also scroll the page behind it, and React's onWheel cannot say so.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      scaleAround(Math.exp(-event.deltaY * WHEEL_SENSITIVITY), event.clientX, event.clientY);
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [scaleAround]);

  // Keeps the thumbnail for the picture on screen in view, so a long strip
  // follows along instead of stranding the reader at the start of it.
  useEffect(() => {
    const active = stripRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [index]);

  const onPointerDown = (event: React.PointerEvent) => {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1 && zoomed) {
      // Capture keeps the drag alive when the cursor leaves the stage. It
      // throws for a pointer the browser does not own, and a throw here would
      // take the whole drag down with it — the pan works without capture.
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Not capturable; dragging still tracks via the move handler.
      }
      draggingRef.current = true;
      setDragging(true);
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const live = pointers.current;
    const previous = live.get(event.pointerId);
    if (!previous) return;
    live.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (live.size >= 2) {
      const [a, b] = [...live.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (!pinch.current) {
        pinch.current = { distance, scale: view.scale };
        return;
      }
      scaleAround(distance / pinch.current.distance, (a.x + b.x) / 2, (a.y + b.y) / 2);
      pinch.current.distance = distance;
      return;
    }

    if (!draggingRef.current) return;
    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    setView((current) => contain({ ...current, x: current.x + dx, y: current.y + dy }));
  };

  const endPointer = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) {
      draggingRef.current = false;
      setDragging(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="animate-fade-in fixed inset-0 z-[60] flex flex-col bg-ink-900/95 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
        <span className="numeric rounded-xl bg-white/10 px-2.5 py-1 text-sm font-bold text-white">
          {index + 1} / {count}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Only once there is something to undo. A reset that is always there
              is a control that does nothing most of the time. */}
          {zoomed ? (
            <StageButton label="Încadrează în ecran" onClick={() => setView(RESET)}>
              <Icons.fitToScreen aria-hidden="true" className="h-5 w-5 shrink-0" />
            </StageButton>
          ) : null}
          {/* Shown spent rather than removed, so the pair keeps its place and
              the reader can see they are already all the way in or out. */}
          <StageButton
            label="Micșorează"
            onClick={() => scaleAround(1 / 1.4)}
            disabled={view.scale <= MIN_SCALE}
          >
            <Icons.zoomOut aria-hidden="true" className="h-5 w-5 shrink-0" />
          </StageButton>
          <StageButton
            label="Mărește"
            onClick={() => scaleAround(1.4)}
            disabled={view.scale >= MAX_SCALE}
          >
            <Icons.zoomIn aria-hidden="true" className="h-5 w-5 shrink-0" />
          </StageButton>
          <StageButton label="Închide" onClick={onClose} ref={closeRef}>
            <Icons.close aria-hidden="true" className="h-5 w-5 shrink-0" />
          </StageButton>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={stageRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onDoubleClick={(event) => scaleAround(zoomed ? 1 / view.scale : 2, event.clientX, event.clientY)}
          className={cn(
            "relative h-full w-full touch-none overflow-hidden",
            zoomed ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in",
          )}
        >
          <Image
            // Keyed on the position, not the file: the same photograph may be
            // listed twice, and two slides that share a key share an element.
            key={index}
            src={images[index] ?? ""}
            alt={alt}
            fill
            unoptimized
            sizes="100vw"
            draggable={false}
            style={{
              transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
            }}
            className={cn(
              "animate-fade-in object-contain select-none",
              // Animated except while a finger or the mouse is on it, where the
              // picture has to keep up with the hand rather than trail it. This
              // is also what carries it home when the zoom comes back to one.
              !dragging && "transition-transform duration-300 ease-out",
            )}
          />
        </div>

        {count > 1 ? (
          <>
            <StageArrow direction="prev" onClick={() => go(index - 1)} />
            <StageArrow direction="next" onClick={() => go(index + 1)} />
          </>
        ) : null}
      </div>

      {count > 1 ? (
        <div
          ref={stripRef}
          data-lenis-prevent
          className="no-scrollbar flex justify-start gap-2 overflow-x-auto scroll-smooth px-3 py-3 sm:px-5"
        >
          {/* Centred only when they fit; left-aligned once they scroll, or the
              first thumbnails sit off the edge with no way back to them. */}
          <div className="mx-auto flex gap-2">
            {images.map((image, thumbIndex) => (
              <button
                key={image}
                type="button"
                onClick={() => go(thumbIndex)}
                data-active={thumbIndex === index}
                aria-label={`Imaginea ${thumbIndex + 1}`}
                aria-current={thumbIndex === index}
                className={cn(
                  "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-800 ring-2 transition sm:h-16 sm:w-16",
                  thumbIndex === index
                    ? "ring-white"
                    : "opacity-60 ring-transparent hover:opacity-100",
                )}
              >
                <Image src={image} alt="" fill unoptimized sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}

function StageButton({
  label,
  onClick,
  disabled,
  children,
  ref,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition",
        disabled ? "cursor-not-allowed opacity-40" : "hover:bg-white/15",
      )}
    >
      {children}
    </button>
  );
}

function StageArrow({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={direction === "prev" ? "Imaginea anterioară" : "Imaginea următoare"}
      className={cn(
        "absolute top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-2xl bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/25",
        direction === "prev" ? "left-3 sm:left-5" : "right-3 sm:right-5",
      )}
    >
      <Icons.crumb
        aria-hidden="true"
        className={cn("h-5 w-5 shrink-0", direction === "prev" && "rotate-180")}
      />
    </button>
  );
}
