"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { Icons } from "@/components/icons";
import { setPageScrollLocked } from "@/components/layout/SmoothScroll";
import {
  coverScale,
  cropOf,
  editImage,
  turn,
  type Rotation,
} from "@/lib/images/edit";
import { INTAKE, type ProcessedImage } from "@/lib/images/process";
import { cn } from "@/lib/utils/cn";

const CARD_RATIO = 3 / 4;

const STAGE_PADDING = 32;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const WHEEL_SENSITIVITY = 0.0018;

const LEAVE_MS = 200;

const MOVE = "transition-[width,height,transform,opacity] duration-300 ease-[var(--ease-out-soft)]";

interface Box {
  width: number;
  height: number;
}

function fit(within: Box, ratio: number): Box {
  const width = Math.min(within.width, within.height * ratio);
  return { width, height: width / ratio };
}

function clamp(value: number, bound: number): number {
  return Math.min(bound, Math.max(-bound, value));
}

export function PhotoEditor({
  photo,
  onApply,
  onDelete,
  onClose,
}: {
  photo: ProcessedImage;
  onApply: (next: ProcessedImage) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [turns, setTurns] = useState(0);
  const [cropping, setCropping] = useState(false);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [stage, setStage] = useState<Box>({ width: 0, height: 0 });
  const [moving, setMoving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const rotation = ((((turns % 4) + 4) % 4) * 90) as Rotation;

  const stageRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  const turned = turn(photo, rotation);
  const frame = fit(
    {
      width: Math.max(0, stage.width - STAGE_PADDING * 2),
      height: Math.max(0, stage.height - STAGE_PADDING * 2),
    },
    CARD_RATIO,
  );
  const cover = frame.width ? coverScale(turned, frame) : 0;
  const whole = frame.width
    ? Math.min(
        (stage.width - STAGE_PADDING * 2) / turned.width,
        (stage.height - STAGE_PADDING * 2) / turned.height,
      )
    : 0;
  const scale = cropping ? cover * zoom : whole;

  const contain = useCallback(
    (next: { x: number; y: number }, at: number) => {
      const size = cover * at;
      return {
        x: clamp(next.x, Math.max(0, (turned.width * size - frame.width) / 2)),
        y: clamp(next.y, Math.max(0, (turned.height * size - frame.height) / 2)),
      };
    },
    [cover, frame.width, frame.height, turned.width, turned.height],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
      const ratio = next / zoom;
      setZoom(next);
      setOffset((current) =>
        contain({ x: current.x * ratio, y: current.y * ratio }, next),
      );
    },
    [contain, zoom],
  );

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      const box = entry?.contentRect;
      if (box) setStage({ width: box.width, height: box.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    setPageScrollLocked(true);
    cancelRef.current?.focus();
    return () => {
      root.style.overflow = previous;
      setPageScrollLocked(false);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLeaving(true);
        window.setTimeout(onClose, LEAVE_MS);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node || !cropping) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoomBy(Math.exp(-event.deltaY * WHEEL_SENSITIVITY));
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => node.removeEventListener("wheel", onWheel);
  }, [cropping, zoomBy]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (!cropping) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      pointers.current.delete(event.pointerId);
    }
    setMoving(true);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const live = pointers.current;
    const previous = live.get(event.pointerId);
    if (!previous) return;
    live.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (live.size >= 2) {
      const [a, b] = [...live.values()];
      const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      if (!pinch.current) {
        pinch.current = { distance, zoom };
        return;
      }
      zoomBy(distance / pinch.current.distance);
      pinch.current.distance = distance;
      return;
    }

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;
    setOffset((current) =>
      contain({ x: current.x + dx, y: current.y + dy }, zoom),
    );
  };

  const reset = () => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  };

  const leave = (after: () => void) => {
    setLeaving(true);
    window.setTimeout(after, LEAVE_MS);
  };

  const endPointer = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) setMoving(false);
  };

  const apply = async () => {
    if (rotation === 0 && !cropping) {
      leave(onClose);
      return;
    }

    setBusy(true);
    setFailed(false);
    try {
      const crop = cropping
        ? cropOf({ turned, frame, scale, offset })
        : undefined;
      const next = await editImage(photo, { rotation, crop }, INTAKE);
      leave(() => onApply(next));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Editează fotografia"
      className={cn(
        "fixed inset-0 z-[70] flex flex-col bg-ink-900",
        leaving ? "animate-fade-out" : "animate-fade-in",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-2 py-2 sm:px-4">
        <BarButton ref={cancelRef} onClick={() => leave(onClose)}>
          Anulează
        </BarButton>
        <BarButton onClick={() => void apply()} strong busy={busy}>
          Gata
        </BarButton>
      </div>

      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        className={cn(
          "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden",
          cropping && "cursor-grab touch-none",
        )}
      >
        <Photo
          photo={photo}
          turns={turns}
          scale={scale}
          offset={cropping ? offset : { x: 0, y: 0 }}
          moving={moving}
          className={cropping ? "opacity-35" : "opacity-100"}
        />

        {frame.width > 0 ? (
          <div
            style={{ width: frame.width, height: frame.height }}
            className={cn(
              "pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl ring-2 ring-white",
              "transition-opacity duration-300 ease-[var(--ease-out-soft)]",
              cropping ? "opacity-100" : "opacity-0",
            )}
          >
            <div className="flex h-full w-full items-center justify-center">
              <Photo
                photo={photo}
                turns={turns}
                scale={scale}
                offset={offset}
                moving={moving}
              />
            </div>
          </div>
        ) : null}
      </div>

      {failed ? (
        <p role="alert" className="px-4 pb-2 text-center text-sm font-semibold text-danger-500">
          Fotografia nu a putut fi pregătită.
        </p>
      ) : null}

      <div className="flex items-stretch justify-center gap-2 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Tool
          label="Rotește"
          icon={<Icons.rotate aria-hidden="true" className="h-5 w-5" />}
          onClick={() => {
            setTurns(turns + 1);
            reset();
          }}
        />
        <Tool
          label="Decupează"
          icon={<Icons.crop aria-hidden="true" className="h-5 w-5" />}
          active={cropping}
          onClick={() => {
            setCropping((on) => !on);
            reset();
          }}
        />
        <Tool
          label="Șterge"
          icon={<Icons.remove aria-hidden="true" className="h-5 w-5" />}
          tone="danger"
          onClick={() => leave(onDelete)}
        />
      </div>
    </div>,
    document.body,
  );
}

function Photo({
  photo,
  turns,
  scale,
  offset,
  moving,
  className,
}: {
  photo: ProcessedImage;
  turns: number;
  scale: number;
  offset: { x: number; y: number };
  moving: boolean;
  className?: string;
}) {
  const turned = turn(photo, ((((turns % 4) + 4) % 4) * 90) as Rotation);

  return (
    <div
      style={{
        width: turned.width * scale,
        height: turned.height * scale,
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
      }}
      className={cn("relative shrink-0", !moving && MOVE, className)}
    >
      <Image
        src={photo.previewUrl}
        alt=""
        width={photo.width}
        height={photo.height}
        unoptimized
        priority
        draggable={false}
        style={{
          width: photo.width * scale,
          height: photo.height * scale,
          transform: `translate(-50%, -50%) rotate(${turns * 90}deg)`,
        }}
        className={cn(
          "absolute top-1/2 left-1/2 max-w-none select-none",
          !moving && MOVE,
        )}
      />
    </div>
  );
}

function BarButton({
  children,
  onClick,
  strong,
  busy,
  ref,
}: {
  children: React.ReactNode;
  onClick: () => void;
  strong?: boolean;
  busy?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={busy}
      className={cn(
        "rounded-xl px-3 py-2 font-display text-[15px] font-extrabold transition",
        strong ? "text-primary-300 hover:bg-white/10" : "text-white hover:bg-white/10",
        busy && "opacity-60",
      )}
    >
      {children}
    </button>
  );
}

function Tool({
  label,
  icon,
  onClick,
  active,
  tone,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  tone?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-w-24 flex-col items-center gap-1 rounded-2xl px-4 py-2.5 text-xs font-bold transition",
        tone === "danger" ? "text-danger-500" : "text-white",
        active ? "bg-white/15" : "hover:bg-white/10",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
