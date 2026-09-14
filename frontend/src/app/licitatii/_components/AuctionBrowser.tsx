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

const HEADER_HEIGHT = 56;

const CONDITION_FILTERS: ItemCondition[] = [
  "NEW",
  "LIKE_NEW",
  "VERY_GOOD",
  "GOOD",
  "USED",
];

const MAX_SEARCH_LENGTH = 120;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const q = (params.get("q") ?? "").slice(0, MAX_SEARCH_LENGTH);
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
          status: OFFERABLE_AUCTION_STATUSES,
          causeId,
          minDonationPercent: minDonation || undefined,
          minPrice: minPrice > PRICE_MIN ? minPrice : undefined,
          maxPrice: maxPrice < PRICE_MAX ? maxPrice : undefined,
          page: Number.isFinite(page) && page > 0 ? page : 1,
          pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
        },
        user?.id,
      ),
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

  const [placeholders, setPlaceholders] = useState<number | null>(null);

  const [pending, setPending] = useState<number | null>(null);

  const [holding, setHolding] = useState(false);
  const settling = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (settling.current !== null) window.clearTimeout(settling.current);
    },
    [],
  );

  const busy = navigating || loading || holding;

  const update = (
    mutate: (next: URLSearchParams) => void,
    { keepPage = false } = {},
  ) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    if (!keepPage) {
      setPlaceholders(null);
      next.delete("page");
    }
    const query = next.toString();

    setHolding(true);
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

  const applyDrafts = (next: URLSearchParams) => {
    const [low, high] = priceDraft;
    if (low > PRICE_MIN) next.set("minPrice", String(low));
    else next.delete("minPrice");
    if (high < PRICE_MAX) next.set("maxPrice", String(high));
    else next.delete("maxPrice");
    if (donationDraft > 0) next.set("minDonation", String(donationDraft));
    else next.delete("minDonation");
  };

  const commitPrice = () => update(applyDrafts);

  const commitDonation = () => update(applyDrafts);

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

  const filterButton = (labelled = false) => (
    <button
      type="button"
      onClick={() => setSheetOpen(true)}
      aria-label={activeCount > 0 ? `Filtre (${activeCount} active)` : "Filtre"}
      className={cn(
        "relative inline-flex h-10 shrink-0 items-center rounded-xl bg-white text-sm font-semibold text-ink-900 ring-1 ring-ink-200 transition hover:ring-ink-300",
        labelled ? "gap-2 px-3" : "w-10 justify-center",
      )}
    >
      <Icons.filter aria-hidden="true" className="h-4 w-4 shrink-0" />
      {labelled ? <span aria-hidden="true">Filtre</span> : null}
      {activeCount > 0 ? (
        <span
          aria-hidden="true"
          className="numeric absolute -top-1.5 -right-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold text-white ring-2 ring-white"
        >
          {activeCount}
        </span>
      ) : null}
    </button>
  );

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
        update((params) => {
          params.set("sort", next || "NEWEST");
          applyDrafts(params);
        })
      }
    />
  );

  return (
    <>
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
          {filterButton(true)}
          <div className="ml-auto w-40">{sortSelect}</div>
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[264px_minmax(0,1fr)]">
        <aside className="hidden min-w-0 lg:block">
          <div className="sticky top-22">
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
          <div
            ref={toolbarRef}
            className="mb-4 flex flex-wrap items-center justify-between gap-2"
          >
            <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Licitații
            </h1>

            <div className="flex shrink-0 items-center gap-2">
              <div className="lg:hidden">{filterButton()}</div>
              <div className="w-40 sm:w-56">{sortSelect}</div>
            </div>
          </div>

          <div className="mb-3 h-5">
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
            <div className={cn(!busy && "animate-reveal")}>
              <AuctionGrid
                auctions={data?.items ?? []}
                loading={busy}
                columns={4}
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
