"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icons } from "@/components/icons";
import { AuctionGrid } from "@/components/auctions/AuctionCard";
import {
  Button,
  ButtonLink,
  CategoryIcon,
  EmptyState,
  ErrorState,
  Pagination,
  RangeSlider,
  SearchField,
  Select,
  Sheet,
  Skeleton,
  Slider,
} from "@/components/ui";
import { scrollPageTo } from "@/components/layout/SmoothScroll";
import { listAuctions } from "@/lib/api/auctions";
import { listCauses } from "@/lib/api/causes";
import {
  PAGINATION,
  AUCTION_CATEGORIES,
  type AuctionCategoryId,
} from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import { ITEM_CONDITION } from "@/lib/labels";
import type { AuctionSort, ItemCondition } from "@/lib/types";
import { OFFERABLE_AUCTION_STATUSES } from "@/lib/types";
import { countRo } from "@/lib/utils/plural";
import { cn } from "@/lib/utils/cn";

const SORTS: { value: AuctionSort; label: string }[] = [
  { value: "NEWEST", label: "Cele mai noi" },
  { value: "MOST_BIDS", label: "Cele mai licitate" },
  { value: "PRICE_ASC", label: "Preț crescător" },
  { value: "PRICE_DESC", label: "Preț descrescător" },
  { value: "DONATION_DESC", label: "Donație maximă" },
];

/** The header bar's height at lg, where this toolbar's stuck state is measured. */
const HEADER_HEIGHT = 56;

/**
 * The five states a listing can declare, best first.
 *
 * <p>Written out rather than derived from the ITEM_CONDITION map, because that is keyed for
 * lookup and its order is an implementation detail; the order a buyer scans them in is a
 * decision, and this is where it is made.
 */
const CONDITION_FILTERS: ItemCondition[] = [
  "NEW",
  "LIKE_NEW",
  "VERY_GOOD",
  "GOOD",
  "USED",
];

/** Mirrors the @Size bound on AuctionQuery.q. */
const MAX_SEARCH_LENGTH = 120;

/** Rejects a hand-typed causeId before it reaches the API and comes back a 400. */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A query-string number, or the fallback when it is missing or not one. */
function readNumber(raw: string | null, fallback: number): number {
  if (raw === null || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function orderedRange(low: number, high: number): [number, number] {
  return low <= high ? [low, high] : [high, low];
}

const PRICE_MIN = 0;
const PRICE_MAX = 500_000;
const PRICE_STEP = 5_000;

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-bold transition",
        active
          ? "bg-primary-600 text-white"
          : "bg-ink-100 text-ink-700 hover:bg-ink-200",
      )}
    >
      {children}
    </button>
  );
}

export function AuctionBrowser() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useAuth();

  const [sheetOpen, setSheetOpen] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    const measure = () =>
      setStuck(toolbar.getBoundingClientRect().bottom < HEADER_HEIGHT);

    const initial = window.setTimeout(measure, 0);
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });

    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, []);

  // Trimmed to the column's own width. The API refuses anything longer, and a
  // pasted paragraph should narrow the results, not blank the page with a 400.
  const q = (params.get("q") ?? "").slice(0, MAX_SEARCH_LENGTH);
  // Everything below is read off a URL anybody can type, share or edit, so none
  // of it is trusted: an unknown sort, a category that does not exist, a price
  // of "abc" or a range the wrong way round all have to land somewhere sane
  // rather than reaching the API as NaN or a 400.
  const sort = SORTS.some((option) => option.value === params.get("sort"))
    ? (params.get("sort") as AuctionSort)
    : "NEWEST";
  const categories = params
    .getAll("category")
    .filter((value): value is AuctionCategoryId =>
      AUCTION_CATEGORIES.some((category) => category.id === value),
    );
  const conditions = params
    .getAll("condition")
    .filter((value): value is ItemCondition =>
      CONDITION_FILTERS.includes(value as ItemCondition),
    );
  const causeId = UUID_PATTERN.test(params.get("causeId") ?? "")
    ? params.get("causeId")!
    : undefined;
  const minDonation = clamp(readNumber(params.get("minDonation"), 0), 0, 100);
  // Read as a pair: a range typed the wrong way round is a range, not an empty
  // result, so the two ends are sorted rather than passed straight through.
  const [minPrice, maxPrice] = orderedRange(
    clamp(readNumber(params.get("minPrice"), PRICE_MIN), PRICE_MIN, PRICE_MAX),
    clamp(readNumber(params.get("maxPrice"), PRICE_MAX), PRICE_MIN, PRICE_MAX),
  );
  const page = Math.max(1, Math.floor(readNumber(params.get("page"), 1)));

  const [priceDraft, setPriceDraft] = useState<[number, number]>([
    minPrice,
    maxPrice,
  ]);
  const [donationDraft, setDonationDraft] = useState(minDonation);

  // The sliders hold a draft so they do not fire a request per pixel, which
  // means they can fall out of step with the URL — on back and forward, or on a
  // link someone else sent. The URL is the truth; the draft follows it.
  //
  // Adjusted during render rather than in an effect, which is what React asks
  // for when state has to follow something outside it: no second paint, and no
  // frame where the sliders disagree with the results beside them.
  const [urlFilter, setUrlFilter] = useState({
    minPrice,
    maxPrice,
    minDonation,
  });
  if (
    urlFilter.minPrice !== minPrice ||
    urlFilter.maxPrice !== maxPrice ||
    urlFilter.minDonation !== minDonation
  ) {
    setUrlFilter({ minPrice, maxPrice, minDonation });
    setPriceDraft([minPrice, maxPrice]);
    setDonationDraft(minDonation);
  }

  const [navigating, startNavigation] = useTransition();

  const { data, loading, error, reload } = useApi(
    () =>
      listAuctions(
        {
          q: q || undefined,
          sort,
          category: categories.length ? categories : undefined,
          condition: conditions.length ? conditions : undefined,
          // Fixed, and not readable from the URL. This page is a catalogue of
          // things you can still make an offer on; a sold listing is history,
          // and belongs on the seller's own shelf rather than here.
          status: OFFERABLE_AUCTION_STATUSES,
          causeId,
          minDonationPercent: minDonation || undefined,
          minPrice: minPrice > PRICE_MIN ? minPrice : undefined,
          maxPrice: maxPrice < PRICE_MAX ? maxPrice : undefined,
          page: Number.isFinite(page) && page > 0 ? page : 1,
        },
        user?.id,
      ),
    // Keyed off what is actually being asked for rather than off the raw query
    // string: two URLs that sanitise to the same filter are the same request,
    // and ?minPrice=abc must not get a cache entry of its own.
    [
      "auctions",
      q,
      sort,
      categories.join(","),
      conditions.join(","),
      causeId ?? "",
      minDonation,
      minPrice,
      maxPrice,
      page,
      user?.id ?? "anon",
    ].join(":"),
  );

  // The list of causes is a separate request, and it can fail on its own while
  // the results beside it load fine. Dropping its loading and error states left
  // an empty dropdown with nothing to pick and no reason given — which reads,
  // correctly, as a broken filter.
  const {
    data: causes,
    loading: causesLoading,
    error: causesError,
  } = useApi(() => listCauses(), "causes-for-filter");

  const causePlaceholder = causesError
    ? "Cauzele nu s-au încărcat"
    : causesLoading
      ? "Se încarcă…"
      : "Toate cauzele";

  /**
   * How many placeholders to draw while a page change is in flight, at the size
   * of the page that is leaving — and at that size for the whole of it.
   *
   * <p>They used to take the incoming page's size once the scroll reported back.
   * That is where the lurch came from: twelve rows becoming two takes 1300px out
   * of the document, and if the glide has not finished the browser clamps the
   * scroll to whatever is left and drags the reader down instead of up. Nothing
   * shrinks until the results themselves arrive, by which time the page is at
   * the top and a change of height moves nothing.
   *
   * <p>Captured rather than read off `data`: a page visited before is already in
   * the cache, so `data` becomes the incoming page in the same frame as the
   * click and the count read from it would be the wrong one at the wrong time.
   */
  const [placeholders, setPlaceholders] = useState<number | null>(null);

  /**
   * The page a click asked for, so the control can answer at once rather than a
   * second later, once the glide is over.
   */
  const [pending, setPending] = useState<number | null>(null);

  /** Placeholders stand from the click until the new page is ready to be seen. */
  const [holding, setHolding] = useState(false);
  const settling = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (settling.current !== null) window.clearTimeout(settling.current);
    },
    [],
  );

  const busy = navigating || loading || holding;

  /**
   * Placeholders from the click, the page goes up, and only once it is there are the results
   * revealed.
   *
   * <p>Every change comes through here, a filter as much as a page. A filter answered out of the
   * cache used to swap under the cursor between one frame and the next, which reads as the list
   * having always said that; the hold is what makes it read as an answer to something pressed.
   *
   * <p>Through Lenis, never `window.scrollTo`: it owns the scroll position while it runs, and a
   * native smooth scroll animating the same property at the same time is what made these lists
   * stutter.
   */
  const update = (
    mutate: (next: URLSearchParams) => void,
    { keepPage = false } = {},
  ) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    // A filter change goes back to page one and cannot know its own size, so
    // the count from the last page click must not be carried into it.
    if (!keepPage) {
      setPlaceholders(null);
      next.delete("page");
    }
    const query = next.toString();

    setHolding(true);
    // The filter lives in the URL, and useSearchParams only catches up once the
    // router has navigated. Until then the key has not changed, nothing is
    // loading, and the previous filter's results sit there looking like an
    // answer. A transition gives an immediate `pending` to show instead.
    startNavigation(() => {
      router.replace(query ? `/licitatii?${query}` : "/licitatii", {
        scroll: false,
      });
    });

    scrollPageTo(0, {
      onComplete: () => {
        if (settling.current !== null) window.clearTimeout(settling.current);
        settling.current = window.setTimeout(() => {
          setHolding(false);
          setPending(null);
          setPlaceholders(null);
        }, PAGINATION.REVEAL_HOLD_MS);
      },
    });
  };

  const toggleValue = (key: string, value: string) =>
    update((next) => {
      const current = next.getAll(key);
      next.delete(key);
      const remaining = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      remaining.forEach((item) => next.append(key, item));
    });

  const commitPrice = () =>
    update((next) => {
      const [low, high] = priceDraft;
      if (low > PRICE_MIN) next.set("minPrice", String(low));
      else next.delete("minPrice");
      if (high < PRICE_MAX) next.set("maxPrice", String(high));
      else next.delete("maxPrice");
    });

  const commitDonation = () =>
    update((next) => {
      if (donationDraft > 0) next.set("minDonation", String(donationDraft));
      else next.delete("minDonation");
    });

  const activeCount =
    categories.length +
    conditions.length +
    (causeId ? 1 : 0) +
    (minDonation ? 1 : 0) +
    (minPrice > PRICE_MIN ? 1 : 0) +
    (maxPrice < PRICE_MAX ? 1 : 0);

  const clearAll = () => {
    setPriceDraft([PRICE_MIN, PRICE_MAX]);
    setDonationDraft(0);
    startNavigation(() => router.replace("/licitatii", { scroll: false }));
    setSheetOpen(false);
  };

  const filters = (
    <div className="flex flex-col gap-7">
      <div>
        <p className="mb-2.5 text-sm font-bold text-ink-700">Cauză</p>
        <Select
          ariaLabel="Cauză"
          size="sm"
          value={causeId ?? ""}
          placeholder={causePlaceholder}
          searchable
          searchPlaceholder="Caută o cauză"
          clearLabel="Toate cauzele"
          options={[...(causes ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name, "ro"))
            .map((cause) => ({
              value: cause.id,
              label: cause.name,
            }))}
          onChange={(next) =>
            update((params) => {
              if (next) params.set("causeId", next);
              else params.delete("causeId");
            })
          }
        />
      </div>
      <div>
        <p className="mb-2.5 text-sm font-bold text-ink-700">Categorie</p>
        <div className="flex flex-wrap gap-2">
          {AUCTION_CATEGORIES.map((category) => (
            <Chip
              key={category.id}
              active={categories.includes(category.id)}
              onClick={() => toggleValue("category", category.id)}
            >
              <CategoryIcon
                set="categories"
                id={category.id}
                className="h-4 w-4"
              />
              {category.label}
            </Chip>
          ))}
        </div>
      </div>
      <div onPointerUp={commitPrice} onKeyUp={commitPrice}>
        <RangeSlider
          label="Preț"
          min={PRICE_MIN}
          max={PRICE_MAX}
          step={PRICE_STEP}
          value={priceDraft}
          onChange={setPriceDraft}
          formatValue={(value) =>
            value >= PRICE_MAX
              ? `${formatMoney(PRICE_MAX, { compact: true, omitCurrency: true })}+`
              : formatMoney(value, { compact: true, omitCurrency: true })
          }
        />
      </div>
      <div onPointerUp={commitDonation} onKeyUp={commitDonation}>
        <Slider
          label="Donație minimă"
          min={0}
          max={100}
          step={5}
          value={donationDraft}
          onChange={setDonationDraft}
          formatValue={(value) => (value === 0 ? "oricât" : `${value}%`)}
        />
      </div>
      <div>
        <p className="mb-2.5 text-sm font-bold text-ink-700">Stare</p>
        <div className="flex flex-wrap gap-2">
          {CONDITION_FILTERS.map((condition) => (
            <Chip
              key={condition}
              active={conditions.includes(condition)}
              onClick={() => toggleValue("condition", condition)}
            >
              {ITEM_CONDITION[condition]}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );

  const filterButton = (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setSheetOpen(true)}
      leftIcon={
        <Icons.filter aria-hidden="true" className="h-4 w-4 shrink-0" />
      }
    >
      Filtre
      {activeCount > 0 ? (
        <span className="numeric ml-1 rounded-md bg-primary-600 px-1.5 text-xs text-white">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );

  // Always rendered: a control that disappears when it has nothing to do leaves
  // people wondering where it went. Grey with nothing to reset, red with something.
  const resetButton = (
    <button
      type="button"
      onClick={clearAll}
      disabled={activeCount === 0}
      className={cn(
        "rounded-lg text-sm font-bold transition",
        activeCount > 0
          ? "text-danger-600 hover:text-danger-700"
          : "cursor-not-allowed text-ink-400",
      )}
    >
      Resetează
    </button>
  );

  const sortSelect = (
    <Select
      ariaLabel="Sortează"
      size="sm"
      value={sort}
      options={SORTS}
      onChange={(next) =>
        update((params) => params.set("sort", next || "NEWEST"))
      }
    />
  );

  return (
    <>
      <div ref={toolbarRef} className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="w-full font-display text-2xl font-extrabold text-ink-900 sm:text-3xl lg:w-auto">
          Licitații
        </h1>

        <SearchField
          key={q}
          term={q}
          label="Caută în licitații"
          placeholder="Caută o licitație"
          className="order-last w-full sm:order-none sm:w-64 lg:ml-auto"
          inputClassName="h-10 rounded-xl"
          onSearch={(value) =>
            update((next) => {
              if (value) next.set("q", value);
              else next.delete("q");
            })
          }
        />
        <div className="lg:hidden">{filterButton}</div>
        <div className="ml-auto w-44 sm:w-56 lg:ml-0">{sortSelect}</div>
      </div>

      <div
        aria-hidden={!stuck}
        className={cn(
          "fixed inset-x-0 top-12 z-30 border-b border-line bg-white/95 px-4 py-2 backdrop-blur-sm transition-[opacity,translate,visibility] duration-300 ease-[cubic-bezier(0.2,0.7,0.3,1)] sm:top-14 sm:px-6 lg:hidden",
          stuck
            ? "visible translate-y-0 opacity-100"
            : "invisible -translate-y-full opacity-0",
        )}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center gap-2">
          {filterButton}
          <div className="ml-auto w-44">{sortSelect}</div>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-18">
            <div className="rounded-3xl bg-white ring-1 ring-edge p-5">
              <div className="mb-5 flex items-center justify-between gap-2 border-b border-line pb-2">
                <h2 className="font-display text-lg font-extrabold text-ink-900">
                  Filtre
                </h2>
                {resetButton}
              </div>
              {filters}
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <div className="mb-3 hidden h-5 sm:block">
            {busy ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <p className="text-sm text-ink-500">
                {countRo(data?.total ?? 0, "rezultat", "rezultate")}
                {q ? ` pentru „${q}”` : ""}
              </p>
            )}
          </div>

          {error ? (
            <ErrorState
              action={
                <Button variant="secondary" onClick={reload}>
                  Încearcă din nou
                </Button>
              }
            />
          ) : (
            // Fading in rather than replacing the placeholders outright. The
            // grid keeps its box either way, so nothing moves; only what is in
            // it changes, and it changes over a beat instead of in a frame.
            <div className={cn(!busy && "animate-reveal")}>
              <AuctionGrid
                auctions={data?.items ?? []}
                loading={busy}
                columns={3}
                // Placeholders for what is *coming*, not for what is leaving.
                // Standing in for the outgoing page means twelve of them and then
                // a collapse to the two rows that actually arrive — the shift
                // lands after the scroll, once the reader has stopped expecting
                // movement, which is what made the last page of a filter jump.
                skeletonCount={
                  placeholders ??
                  data?.items.length ??
                  PAGINATION.DEFAULT_PAGE_SIZE
                }
                emptyState={
                  <EmptyState
                    title="Nicio licitație găsită"
                    action={
                      activeCount > 0 ? (
                        <Button onClick={clearAll}>Șterge filtrele</Button>
                      ) : (
                        <ButtonLink href="/cont/vanzari/nou">
                          Vinde acum
                        </ButtonLink>
                      )
                    }
                  />
                }
              />
            </div>
          )}

          {data ? (
            <Pagination
              page={pending ?? data.page}
              totalPages={data.totalPages}
              className="mt-8"
              onChange={(next) => {
                if (next === data.page) return;
                // The placeholders stand in for the page that is leaving, which
                // is what keeps the glide smooth: swapping twelve cards for two
                // collapses the document under the scroll, the browser clamps
                // it, and the glide becomes a lurch.
                setPending(next);
                setPlaceholders(data.items.length);
                update((params) => params.set("page", String(next)), {
                  keepPage: true,
                });
              }}
            />
          ) : (
            <div className="mt-8 h-10" />
          )}
        </div>
      </div>
      <Sheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Filtre"
        footer={
          <>
            <Button
              variant="secondary"
              fullWidth
              onClick={clearAll}
              disabled={activeCount === 0}
            >
              Resetează
            </Button>
            <Button fullWidth onClick={() => setSheetOpen(false)}>
              Afișează {data?.total ?? 0}
            </Button>
          </>
        }
      >
        {filters}
      </Sheet>
    </>
  );
}
