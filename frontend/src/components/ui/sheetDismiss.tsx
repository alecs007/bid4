"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

const SHEET_BELOW_PX = 640;

const DISMISS_AFTER_PX = 140;

const LEAVE_MS = 200;

export function useSheetDismiss({
  open,
  onClose,
  panelRef,
}: {
  open: boolean;
  onClose: () => void;
  panelRef: RefObject<HTMLDivElement | null>;
}) {
  const [pulled, setPulled] = useState(0);
  const [height, setHeight] = useState(0);
  const [pulling, setPulling] = useState(false);
  const [grabbed, setGrabbed] = useState(false);
  const from = useRef(0);
  const leaving = useRef<number | null>(null);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setPulled(0);
      setPulling(false);
      setGrabbed(false);
    }
  }

  useEffect(() => {
    if (!open || leaving.current === null) return;
    window.clearTimeout(leaving.current);
    leaving.current = null;
  }, [open]);

  useEffect(
    () => () => {
      if (leaving.current !== null) window.clearTimeout(leaving.current);
    },
    [],
  );

  const grab = (event: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth >= SHEET_BELOW_PX) return;
    from.current = event.clientY;
    setHeight(panelRef.current?.getBoundingClientRect().height ?? 0);
    setPulling(true);
    setGrabbed(true);
  };

  useEffect(() => {
    if (!pulling) return;

    const travelled = (event: PointerEvent) =>
      Math.max(0, event.clientY - from.current);

    const move = (event: PointerEvent) => setPulled(travelled(event));

    const release = (event: PointerEvent) => {
      setPulling(false);
      const panel = panelRef.current?.getBoundingClientRect().height ?? 0;
      if (travelled(event) > Math.min(DISMISS_AFTER_PX, panel * 0.25)) {
        setPulled(panel);
        leaving.current = window.setTimeout(onClose, LEAVE_MS);
      } else {
        setPulled(0);
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [pulling, onClose, panelRef]);

  return {
    grab,
    grabbed,
    pulling,
    panelStyle: pulled ? { transform: `translateY(${pulled}px)` } : undefined,
    backdropStyle:
      pulled && height
        ? { opacity: Math.max(0, 1 - pulled / height) }
        : undefined,
  };
}

export function SheetGrabber() {
  return (
    <div
      aria-hidden="true"
      className="flex justify-center pt-2.5 pb-1 sm:hidden"
    >
      <span className="h-1 w-10 rounded-full bg-ink-200" />
    </div>
  );
}
