"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/** Below this a dialog is a sheet with a bar to pull; above it there is nothing to pull. */
const SHEET_BELOW_PX = 640;

/** How far down the sheet has to be thrown before letting go dismisses it. */
const DISMISS_AFTER_PX = 140;

/** How long it takes to leave, once thrown. */
const LEAVE_MS = 200;

/**
 * Pull-to-dismiss, shared by every dialog that becomes a sheet on a phone.
 *
 * <p>The pull is followed on the window rather than through `setPointerCapture`, which throws when
 * the pointer has already gone and leaves a sheet stuck halfway down the screen.
 *
 * <p>The state is reset whenever the dialog opens, because these components stay mounted between
 * openings — a sheet thrown away once would otherwise come back already translated off-screen,
 * which reads as it refusing to open at all.
 */
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
  /** Measured when the sheet is grabbed, so the backdrop can fade in step with it. */
  const [height, setHeight] = useState(0);
  const [pulling, setPulling] = useState(false);
  /** Latched, because re-adding the entrance class on release would replay it. */
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

  // A dialog reopened inside the two hundred milliseconds its last dismissal
  // takes would be shut again by that dismissal's own timer.
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
        // Sent the rest of the way out before it unmounts, so it leaves the
        // way it was thrown rather than blinking off under the finger.
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
    /** Inline transform for the panel, or nothing while it is at rest. */
    panelStyle: pulled ? { transform: `translateY(${pulled}px)` } : undefined,
    /** The backdrop goes with the sheet rather than after it. */
    backdropStyle:
      pulled && height
        ? { opacity: Math.max(0, 1 - pulled / height) }
        : undefined,
  };
}

/** The bar that says a sheet can be pulled. Drawn only where there is a sheet to pull. */
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
