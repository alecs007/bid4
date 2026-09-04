"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { CategoryIcon, Input, LoadMore, Skeleton } from "@/components/ui";
import { listCauses } from "@/lib/api/causes";
import {
  CAUSE_CATEGORIES,
  PAGINATION,
  type CauseCategoryId,
} from "@/lib/config";
import { useApi, useWindowedList } from "@/lib/hooks/useApi";
import { formatMoney, progressPercent } from "@/lib/money";
import type { CauseDetail } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

/**
 * Which cause the money goes to, chosen by looking rather than by reading a list of names.
 *
 * <p>A dropdown was the wrong control. Every other field here is a fact the seller already knows;
 * this is a choice they may make on the spot, and a name alone gives them nothing to make it on.
 *
 * <p>Round portraits in a row, the way a person is shown everywhere else on the site — no cards,
 * no outlines, nothing boxed. The selection is a ring on the portrait itself, which is the thing
 * being chosen, so there is no chrome to draw and none to keep aligned.
 */
export function CausePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (cause: CauseDetail) => void;
}) {
  const [term, setTerm] = useState("");
  const [category, setCategory] = useState<CauseCategoryId | "">("");
  const railRef = useRef<HTMLDivElement>(null);

  const { data, loading } = useApi(
    () => listCauses({ status: ["ACTIVE", "APPROVED"] }),
    "causes-for-listing",
  );

  // Filtered in memory: the whole list is one small request and already in hand,
  // so typing costs nothing and never blanks the rail.
  const matching = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return (data ?? []).filter((cause) => {
      if (category && cause.category !== category) return false;
      if (!needle) return true;
      return `${cause.name} ${cause.shortDescription}`
        .toLowerCase()
        .includes(needle);
    });
  }, [data, term, category]);

  const shown = useWindowedList(
    matching,
    `${term}:${category}`,
    PAGINATION.DEFAULT_PAGE_SIZE,
  );

  // Only categories with something behind them: a filter that leads to an empty
  // rail is a control nobody should be able to press.
  const populated = useMemo(() => {
    const present = new Set((data ?? []).map((cause) => cause.category));
    return CAUSE_CATEGORIES.filter((entry) => present.has(entry.id));
  }, [data]);

  const chosen = (data ?? []).find((cause) => cause.id === value);

  // The panel outlives the selection by the length of its close, so it has
  // something to show on the way out instead of collapsing empty. Adjusted
  // during render rather than in an effect, which is what React asks for when
  // state has to follow a prop.
  const [shownCause, setShownCause] = useState<CauseDetail | null>(null);
  if (chosen && chosen.id !== shownCause?.id) setShownCause(chosen);

  return (
    <div className="flex flex-col gap-3">
      <Input
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        placeholder="Caută o cauză"
        aria-label="Caută o cauză"
        leading={
          <Icons.search aria-hidden="true" className="h-4 w-4 shrink-0" />
        }
      />

      {/* Text-only filters, sitting on the panel rather than in outlined pills.
          Nine bordered chips above a row of portraits was two competing frames
          around the one thing being chosen. */}
      <div className="no-scrollbar flex gap-1 overflow-x-auto py-1">
        <Filter
          active={category === ""}
          onClick={() => setCategory("")}
          label="Toate"
        />
        {populated.map((entry) => (
          <Filter
            key={entry.id}
            active={category === entry.id}
            onClick={() => setCategory(entry.id)}
            label={entry.label}
            icon={
              <CategoryIcon
                set="causes"
                id={entry.id}
                className="h-4 w-4"
                sizes="16px"
              />
            }
          />
        ))}
      </div>

      <div
        ref={railRef}
        data-lenis-prevent
        role="radiogroup"
        aria-label="Cauza susținută"
        // p-1 with no negative margin to take it back: the selected ring sits
        // 4px outside its portrait and an overflow container clips anything
        // leaving its padding box, but pulling the row wider than its parent is
        // what put a horizontal scrollbar inside the modal.
        className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto p-1"
      >
        {loading && !data
          ? Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="w-[72px] shrink-0">
                <Skeleton className="h-14 w-14 rounded-full" />
                <Skeleton className="mt-1.5 h-3 w-full" />
              </div>
            ))
          : (shown.items ?? []).map((cause) => (
              <CauseChoice
                key={cause.id}
                cause={cause}
                selected={cause.id === value}
                onSelect={() => onChange(cause)}
              />
            ))}

        <LoadMore
          hasMore={shown.hasMore}
          onReach={shown.loadMore}
          root={railRef}
          orientation="horizontal"
        />
      </div>

      {!loading && matching.length === 0 ? (
        <p className="text-sm text-ink-500">
          Nicio cauză nu corespunde căutării.
        </p>
      ) : null}

      {/* The portraits carry a picture and a name, which is all a row of them can
          hold. Everything worth knowing about the one actually chosen appears
          here instead, where there is room for it and only for one.

          Opened by a grid row rather than mounted: the panel is a third of the
          field's height, and dropping it in finished shoved everything below it
          down a step while it was still fading. Growing into place moves the
          page by the same amount over the same time the panel takes to arrive,
          which reads as one thing happening instead of two. */}
      <div
        aria-hidden={!chosen}
        inert={!chosen}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out-soft)]",
          chosen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "pt-1 transition-transform duration-300 ease-[var(--ease-out-soft)]",
              chosen ? "translate-y-0" : "-translate-y-2",
            )}
          >
            {shownCause ? <ChosenCause cause={shownCause} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The cause that was picked, on one line under the row.
 *
 * <p>It used to be a card with the description and a link out to the cause's page, and it was a
 * third of the modal — enough that choosing a cause pushed the percentage below the fold. What is
 * worth saying here is which one is chosen and how far along it is; the rest is a page away.
 *
 * <p>No entrance of its own: the wrapper animates, and switching from one cause to another swaps
 * the text in place. Replaying a fade on every change made the answer flinch each time the reader
 * moved along the row.
 */
function ChosenCause({ cause }: { cause: CauseDetail }) {
  const percent = Math.round(
    progressPercent(cause.raisedAmount, cause.goalAmount),
  );

  return (
    <div className="flex items-center gap-2.5 rounded-2xl bg-canvas p-2.5">
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-ink-100">
        <Image
          src={cause.imageUrl}
          alt=""
          fill
          unoptimized
          sizes="40px"
          className="object-cover"
          draggable={false}
        />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-extrabold text-ink-900">
          {cause.name}
        </p>

        <div
          className="mt-1 h-1 w-full overflow-hidden rounded-full bg-ink-200"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Strâns din obiectiv pentru ${cause.name}`}
        >
          <div
            className="h-full rounded-full bg-primary-500 transition-[width] duration-500"
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>

        <p className="numeric mt-1 text-[11px] text-ink-500">
          <strong className="text-ink-800">
            {formatMoney(cause.raisedAmount)}
          </strong>{" "}
          din {formatMoney(cause.goalAmount)} · {percent}%
        </p>
      </div>
    </div>
  );
}

function Filter({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold whitespace-nowrap transition",
        active
          ? "bg-primary-100 text-primary-900"
          : "text-ink-500 hover:bg-ink-100 hover:text-ink-800",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * One cause: a portrait, its name, and how far along it is.
 *
 * <p>Round, because that is how a person is shown everywhere else here, and because a circle in a
 * row of circles needs no border to be read as one of a set. The ring appears only on the chosen
 * one, so the row is quiet until a decision is made.
 *
 * <p>The figures are written out. "12,4k" saves eleven pixels and costs the reader a translation,
 * on the one number the whole choice is about.
 */
function CauseChoice({
  cause,
  selected,
  onSelect,
}: {
  cause: CauseDetail;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      title={`${cause.name} — ${formatMoney(cause.raisedAmount)} din ${formatMoney(cause.goalAmount)}`}
      className="group flex w-[72px] shrink-0 snap-start flex-col items-center gap-1.5 text-center"
    >
      <span className="relative inline-flex">
        <span
          className={cn(
            "relative block h-14 w-14 overflow-hidden rounded-full bg-ink-100 transition",
            selected
              ? "ring-1 ring-primary-500 ring-offset-2 ring-offset-white"
              : "ring-1 ring-black/5 group-hover:ring-ink-300",
          )}
        >
          <Image
            src={cause.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="56px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            draggable={false}
          />
        </span>

        {selected ? (
          <span className="absolute -right-0.5 -bottom-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white ring-2 ring-white">
            <Icons.check aria-hidden="true" className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </span>

      <span
        className={cn(
          "text-[11px] leading-tight font-bold transition",
          selected ? "text-primary-800" : "text-ink-800",
        )}
      >
        <span className="line-clamp-2">{cause.name}</span>
      </span>
    </button>
  );
}
