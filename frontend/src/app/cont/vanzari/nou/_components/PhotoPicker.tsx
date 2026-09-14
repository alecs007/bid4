"use client";

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { FadeImage } from "@/components/ui";
import { AUCTION, IMAGE, USE_MOCK } from "@/lib/config";
import { ImageRejected, processImage } from "@/lib/images/process";
import type { ProcessedImage } from "@/lib/images/process";
import { cn } from "@/lib/utils/cn";

const ACCEPT = "image/jpeg,image/png,image/webp";

/** How far a mouse travels before a press on a photograph becomes a drag rather than a click. */
const DRAG_AFTER_PX = 8;

/**
 * How long a finger rests on a photograph before it is picked up.
 *
 * <p>Long enough that a swipe across the row never becomes a reorder, short enough that holding a
 * card does not feel broken. Anything under about 200ms starts catching swipes.
 */
const HOLD_MS = 280;

/** How far a finger may wander during the hold before it counts as a swipe instead. */
const HOLD_SLOP_PX = 10;

/** One card's width. Fixed, because the row scrolls rather than wrapping. */
const CARD =
  "relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-2xl sm:w-28";

/**
 * The same height a card ends up at, given to the empty state.
 *
 * <p>96px and 112px wide at 3:4 are 128px and 149.33px tall. Written out rather than derived,
 * because the empty state has no aspect ratio to derive it from — and if the two disagree the whole
 * form jumps the moment the first photograph lands, which is exactly the kind of shift a seller
 * reads as the page breaking.
 */
const CARD_HEIGHT = "h-32 sm:h-[9.3333rem]";

/** Smaller copies where the only place to put them is the browser's own storage. */
const SETTINGS = USE_MOCK
  ? { maxEdge: IMAGE.DEMO_MAX_EDGE_PX, quality: IMAGE.DEMO_QUALITY }
  : { maxEdge: IMAGE.MAX_EDGE_PX, quality: IMAGE.QUALITY };

/**
 * One wide target until there is something to show, then the photographs themselves.
 *
 * <p>The empty state is one button and nothing else: a plus and what it does. It takes a drop as
 * readily as a click. What the formats are sits under the control rather than inside it — it is
 * worth knowing and it is not worth a second line inside a target.
 *
 * <p>Order is the whole interface once they arrive. The first is the cover, and it is made the
 * cover by being dragged to the front — a "fă copertă" button on every card was a second way to
 * say what the position already says. The drag is followed on the window rather than through
 * `setPointerCapture`, which throws when the pointer has already gone and leaves a card stuck to
 * the finger.
 *
 * <p><b>The row scrolls, so the two gestures had to be separated.</b> It used to wrap into a grid
 * with `touch-none` on every card, which meant a finger could only ever reorder — fine for a grid
 * that fits, impossible for a row you also have to scroll. So a mouse drags immediately, as it
 * always did, and a finger must rest on a card for {@link HOLD_MS} first. Until it does, the
 * browser owns the gesture and the row scrolls normally; once the card is picked up, a non-passive
 * `touchmove` takes it back. That order matters — the hold is what guarantees the browser has not
 * already begun scrolling by the time we cancel it, because a scroll in progress cannot be taken
 * over.
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
  const rowRef = useRef<HTMLDivElement>(null);
  const [refused, setRefused] = useState<string | null>(null);
  /** How many are still being decoded, drawn as cards so the row keeps its shape. */
  const [working, setWorking] = useState(0);
  const [fileOver, setFileOver] = useState(false);
  const [dragged, setDragged] = useState<number | null>(null);
  /** The card a finger is resting on, before the hold has turned it into a drag. */
  const [holding, setHolding] = useState<number | null>(null);
  const from = useRef({ x: 0, y: 0 });
  const holdTimer = useRef<number | null>(null);
  /** True once the press has travelled far enough to be a drag and not a click. */
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

  /**
   * The end of the row, after every addition.
   *
   * <p>A photograph lands at the end, and on a phone the end is off screen by the third one — so
   * without this a seller taps "adaugă", something happens somewhere to the right, and the row
   * looks unchanged. Scrolling to the far edge brings the add card back into view, or the last
   * photograph once there is no add card left to show.
   */
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

  // The waiting half of a touch press. Nothing is prevented here, so while this
  // is running the row scrolls exactly as it would with no drag logic at all —
  // and the first sign of a swipe cancels the hold rather than fighting it.
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
    // A scroll starting means the browser took the gesture, which settles it.
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

      // Carried past the edge, the row follows. Driven by the pointer rather
      // than by a timer, which is enough here: a drag is a moving finger, and
      // eight cards are never more than a couple of screens wide.
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

    // Non-passive, and the only reason the card can be dragged along a row that
    // also scrolls. The hold has already happened, so the browser has not begun
    // a scroll and this still cancels one.
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
        // One row, always, and the same box whether it holds one wide button or
        // eight photographs — which is what keeps the swap between the two from
        // moving anything. It scrolls rather than wrapping, so the first
        // photograph stays where the seller left it instead of hopping onto
        // another line every time one is added or removed.
        //
        // No scroll-snap. Mandatory snapping would pull scrollLeft back to the
        // nearest card every time a drag nudges the row past an edge, which is
        // the one place in this component that moves it by hand.
        className={cn(
          "-mx-1.5 -my-1.5 flex gap-2 overflow-x-auto overscroll-x-contain p-1.5",
          // A ring is painted outside the border box, and `overflow-x: auto`
          // computes `overflow-y` to auto as well — so with no padding the
          // cover's ring came back clipped top and bottom, and a stray vertical
          // bar appeared with it. The negative margins hand the padding back,
          // so the row occupies exactly what it did before.
          //
          // And no bar of its own, at any width. A horizontal bar is in the
          // flow and appears only once the row overflows, so it moved the form
          // 10px the moment a third photograph arrived — measured, and not
          // fixable with `scrollbar-gutter`, which reserves the vertical gutter
          // only. Nothing is lost: a finger drags the row, and a wheel over an
          // element that scrolls in one axis scrolls it in that axis.
          "no-scrollbar",
        )}
      >
        {/* Two things, not one. The dashed box is the drop target and says as
            much by being dashed; the control inside it is an ordinary bordered
            button, because that is what it is. One element trying to be both
            read as a dashed button, which is neither.

            The box takes the drop and the button takes the click, so neither
            handles the other's job and nothing fires twice.

            Both borders are the same weight. At 2px dashed against 1px solid
            the box shouted and the button whispered, and the two read as
            belonging to different screens. 1.5px is where they meet.

            Ink, not green. A green button inside a dashed box was tried and
            read as a second brand mark on a form that already has one; the
            green is kept for the hover, where it says the control answers. */}
        {empty ? (
          <div
            onDragOver={overFiles}
            onDragLeave={() => setFileOver(false)}
            onDrop={dropFiles}
            className={cn(
              "flex w-full shrink-0 items-center justify-center rounded-2xl border-[1.5px] border-dashed transition-colors",
              CARD_HEIGHT,
              // Only the border answers a dragged file. A fill would tint the
              // whole panel, and the panel is not the thing being offered.
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
            // No `touch-none`: the browser owns the gesture until a hold says
            // otherwise, which is what lets this row scroll under a finger.
            // The callout is off so a long press opens no "save image" menu
            // over the card it is picking up.
            className={cn(
              CARD,
              "group bg-ink-100 ring-1 transition select-none [-webkit-touch-callout:none]",
              index === 0 ? "ring-primary-500" : "ring-edge",
              dragged === index && "cursor-grabbing opacity-60",
              dragged !== index && "cursor-grab",
              // A card being held, before it is picked up: enough to show the
              // press landed, not enough to look like it has moved.
              holding === index && "scale-95",
            )}
            onPointerDown={(event) => {
              if (event.pointerType === "mouse") {
                if (event.button !== 0) return;
                // Stops the browser starting its own image drag, which a
                // touch press must not do — see below.
                event.preventDefault();
                from.current = { x: event.clientX, y: event.clientY };
                loose.current = false;
                setDragged(index);
                return;
              }

              // Nothing is prevented for a finger. preventDefault here would
              // suppress the scroll this row depends on, and the press may
              // still turn out to be a swipe.
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

        {/* A card each for the ones still being prepared, so the row grows as
              they are chosen instead of after the last one is ready. */}
        {Array.from({ length: working }, (_, index) => (
          <div
            key={`working-${index}`}
            className={cn(CARD, "shimmer bg-ink-100 ring-1 ring-edge")}
          />
        ))}

        {/* Always the last thing in the row, after the photographs and after
              any still being prepared. It carries no `data-photo`, so a card
              dragged to the far end cannot land beyond it — `cardUnder` finds
              nothing there and the reorder is simply ignored. */}
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

      {/* Always rendered, and faded rather than added: its height is reserved in
          both states, so the line appearing with the first photograph does not
          push the rest of the form down. Centred, because it is about the row
          as a whole and not about the photograph it sits beneath. */}
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
