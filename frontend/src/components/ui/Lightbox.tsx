"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icons } from "@/components/icons";
import { setPageScrollLocked } from "@/components/layout/SmoothScroll";
import { cn } from "@/lib/utils/cn";

const ZOOM = 2.4;

/**
 * The photographs, full size. Portalled to `document.body` for the same reason
 * every other dialog is: the page wrapper's animation makes it a stacking
 * context, and a z-index inside it cannot reach past the header.
 */
export function Lightbox({
  images,
  alt,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  alt: string;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const closeRef = useRef<HTMLButtonElement>(null);

  const count = images.length;

  // A new photograph starts unzoomed, or the pan lands somewhere arbitrary.
  const go = useCallback(
    (next: number) => {
      setZoomed(false);
      onIndexChange(next);
    },
    [onIndexChange],
  );

  useEffect(() => {
    // The scroll lock goes on <html>, or the root scrollbar leaves a strip of
    // page down the right edge of a fixed overlay. The width it gave back is
    // paid to <body> rather than <html>: Lenis makes <html> the containing
    // block for fixed children, so padding there would shrink this dialog.
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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      root.style.overflow = previous.overflow;
      document.body.style.paddingRight = previous.paddingRight;
      setPageScrollLocked(false);
    };
  }, [go, index, onClose]);

  const track = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setOrigin({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="animate-fade-in fixed inset-0 z-[60] flex flex-col bg-ink-900/95 backdrop-blur-sm"
    >
      {/* --- bar ------------------------------------------------------- */}
      <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-5">
        <span className="numeric rounded-xl bg-white/10 px-2.5 py-1 text-sm font-bold text-white">
          {index + 1} / {count}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setZoomed((current) => !current)}
            aria-label={zoomed ? "Micșorează" : "Mărește"}
            aria-pressed={zoomed}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15"
          >
            <Icons.search aria-hidden="true" className="h-5 w-5" />
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Închide"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-white transition hover:bg-white/15"
          >
            <Icons.close aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* --- stage ----------------------------------------------------- */}
      <div className="relative min-h-0 flex-1">
        <div
          onClick={() => setZoomed((current) => !current)}
          onMouseMove={track}
          className={cn(
            "relative h-full w-full overflow-hidden",
            zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
          )}
        >
          <Image
            key={images[index]}
            src={images[index] ?? ""}
            alt={alt}
            fill
            unoptimized
            sizes="100vw"
            style={{
              transform: zoomed ? `scale(${ZOOM})` : undefined,
              transformOrigin: `${origin.x}% ${origin.y}%`,
            }}
            className="animate-fade-in object-contain transition-transform duration-300 ease-out"
          />
        </div>

        {count > 1 ? (
          <>
            <StageArrow
              direction="prev"
              onClick={() => go(index - 1)}
            />
            <StageArrow
              direction="next"
              onClick={() => go(index + 1)}
            />
          </>
        ) : null}
      </div>

      {/* --- previews -------------------------------------------------- */}
      {count > 1 ? (
        <div className="no-scrollbar flex justify-start gap-2 overflow-x-auto px-3 py-3 sm:justify-center sm:px-5">
          {images.map((image, thumbIndex) => (
            <button
              key={image}
              type="button"
              onClick={() => go(thumbIndex)}
              aria-label={`Imaginea ${thumbIndex + 1}`}
              aria-current={thumbIndex === index}
              className={cn(
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-800 ring-2 transition sm:h-16 sm:w-16",
                thumbIndex === index
                  ? "ring-white"
                  : "opacity-60 ring-transparent hover:opacity-100",
              )}
            >
              <Image
                src={image}
                alt=""
                fill
                unoptimized
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>,
    document.body,
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
        className={cn("h-5 w-5", direction === "prev" && "rotate-180")}
      />
    </button>
  );
}
