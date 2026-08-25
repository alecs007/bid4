"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { AuctionGrid } from "@/components/auctions/AuctionCard";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  RangeSlider,
  Pagination,
  Select,
  SearchField,
  Sheet,
  Skeleton,
  Slider,
} from "@/components/ui";
import { listAuctions } from "@/lib/api/auctions";
import { listCauses } from "@/lib/api/causes";
import {
  PAGINATION,
  PRODUCT_CATEGORIES,
  type ProductCategoryId,
} from "@/lib/config";
import { AUCTION_STATUS } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import type { AuctionSort, AuctionStatus } from "@/lib/types";
import { countRo } from "@/lib/utils/plural";
import { cn } from "@/lib/utils/cn";

const SORTS: { value: AuctionSort; label: string }[] = [
  { value: "ENDING_SOON", label: "Se termină curând" },
  { value: "NEWEST", label: "Cele mai noi" },
  { value: "MOST_BIDS", label: "Cele mai licitate" },
  { value: "PRICE_ASC", label: "Preț crescător" },
  { value: "PRICE_DESC", label: "Preț descrescător" },
  { value: "DONATION_DESC", label: "Donație maximă" },
];

const STATUS_FILTERS: AuctionStatus[] = ["LIVE", "SCHEDULED", "SOLD", "UNSOLD"];

const HEADER_HEIGHT = 64;

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

  const q = params.get("q") ?? "";
  const sort = (params.get("sort") as AuctionSort | null) ?? "ENDING_SOON";
  const categories = params.getAll("category") as ProductCategoryId[];
  const statuses = params.getAll("status") as AuctionStatus[];
  const causeId = params.get("causeId") ?? undefined;
  const endingSoon = params.get("endingSoon") === "1";
  const minDonation = Number(params.get("minDonation") ?? 0);
  const minPrice = Number(params.get("minPrice") ?? PRICE_MIN);
  const maxPrice = Number(params.get("maxPrice") ?? PRICE_MAX);
  const page = Number(params.get("page") ?? 1);

  const [priceDraft, setPriceDraft] = useState<[number, number]>([
    minPrice,
    maxPrice,
  ]);
  const [donationDraft, setDonationDraft] = useState(minDonation);

  const { data, loading, error, reload } = useApi(
    () =>
      listAuctions(
        {
          q: q || undefined,
          sort,
          category: categories.length ? categories : undefined,
          status: statuses.length ? statuses : undefined,
          causeId,
          endingSoon: endingSoon || undefined,
          minDonationPercent: minDonation || undefined,
          minPrice: minPrice > PRICE_MIN ? minPrice : undefined,
          maxPrice: maxPrice < PRICE_MAX ? maxPrice : undefined,
          page: Number.isFinite(page) && page > 0 ? page : 1,
        },
        user?.id,
      ),
    `auctions:${params.toString()}:${user?.id ?? "anon"}`,
  );

  const { data: causes } = useApi(() => listCauses(), "causes-for-filter");

  const update = (
    mutate: (next: URLSearchParams) => void,
    { keepPage = false } = {},
  ) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    if (!keepPage) next.delete("page");
    const query = next.toString();
    router.replace(query ? `/licitatii?${query}` : "/licitatii", {
      scroll: false,
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
    statuses.length +
    (causeId ? 1 : 0) +
    (endingSoon ? 1 : 0) +
    (minDonation ? 1 : 0) +
    (minPrice > PRICE_MIN ? 1 : 0) +
    (maxPrice < PRICE_MAX ? 1 : 0);

  const clearAll = () => {
    setPriceDraft([PRICE_MIN, PRICE_MAX]);
    setDonationDraft(0);
    router.replace("/licitatii", { scroll: false });
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
          placeholder="Toate cauzele"
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
          {PRODUCT_CATEGORIES.map((category) => (
            <Chip
              key={category.id}
              active={categories.includes(category.id)}
              onClick={() => toggleValue("category", category.id)}
            >
              <span aria-hidden="true">{category.emoji}</span>
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
          <Chip
            active={endingSoon}
            onClick={() =>
              update((next) => {
                if (endingSoon) next.delete("endingSoon");
                else next.set("endingSoon", "1");
              })
            }
          >
            <Icons.urgent aria-hidden="true" className="h-4 w-4" />
            Sub 24h
          </Chip>
          {STATUS_FILTERS.map((status) => (
            <Chip
              key={status}
              active={statuses.includes(status)}
              onClick={() => toggleValue("status", status)}
            >
              {AUCTION_STATUS[status].label}
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
      leftIcon={<Icons.filter aria-hidden="true" className="h-4 w-4" />}
    >
      Filtre
      {activeCount > 0 ? (
        <span className="numeric ml-1 rounded-md bg-primary-600 px-1.5 text-xs text-white">
          {activeCount}
        </span>
      ) : null}
    </Button>
  );

  // Always rendered, never hidden: a control that disappears when it has
  // nothing to do leaves people wondering where it went. Grey when there is
  // nothing to reset, red when there is.
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
        update((params) => params.set("sort", next || "ENDING_SOON"))
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
          "fixed inset-x-0 top-14 z-30 border-b border-line bg-white/95 px-4 py-2 backdrop-blur-sm transition-[opacity,translate,visibility] duration-300 ease-[cubic-bezier(0.2,0.7,0.3,1)] sm:top-16 sm:px-6 lg:hidden",
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
          <div className="sticky top-24">
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
            {loading ? (
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
            <AuctionGrid
              auctions={data?.items ?? []}
              loading={loading}
              columns={3}
              skeletonCount={PAGINATION.DEFAULT_PAGE_SIZE}
              emptyState={
                <EmptyState
                  title="Nimic pe filtrele astea"
                  action={
                    activeCount > 0 ? (
                      <Button onClick={clearAll}>Șterge filtrele</Button>
                    ) : (
                      <ButtonLink href="/cont/anunturi/nou">
                        Vinde acum
                      </ButtonLink>
                    )
                  }
                />
              }
            />
          )}

          {data ? (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              className="mt-8"
              onChange={(next) => {
                update((params) => params.set("page", String(next)), {
                  keepPage: true,
                });
                window.scrollTo({ top: 0, behavior: "smooth" });
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
