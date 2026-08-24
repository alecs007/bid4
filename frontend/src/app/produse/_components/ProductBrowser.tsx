"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Icons } from "@/components/icons";
import { ProductGrid } from "@/components/products/ProductCard";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Input,
  Pagination,
  Skeleton,
} from "@/components/ui";
import { listProducts } from "@/lib/api/products";
import { PAGINATION, PRODUCT_CATEGORIES, type ProductCategoryId } from "@/lib/config";
import { useApi } from "@/lib/hooks/useApi";
import { cn } from "@/lib/utils/cn";

/**
 * The catalogue: the same objects as `/licitatii`, browsed as things rather
 * than as running auctions. Filters stay in the URL, so a filtered catalogue
 * is a link someone can send.
 */
export function ProductBrowser() {
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const categories = params.getAll("category") as ProductCategoryId[];
  const page = Number(params.get("page") ?? 1);

  const [draft, setDraft] = useState(q);

  const { data, loading, error, reload } = useApi(
    () =>
      listProducts({
        q: q || undefined,
        category: categories.length ? categories : undefined,
        page: Number.isFinite(page) && page > 0 ? page : 1,
      }),
    `products:${params.toString()}`,
  );

  const update = (
    mutate: (next: URLSearchParams) => void,
    { keepPage = false } = {},
  ) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    if (!keepPage) next.delete("page");
    const query = next.toString();
    router.replace(query ? `/produse?${query}` : "/produse", { scroll: false });
  };

  const toggleCategory = (id: ProductCategoryId) =>
    update((next) => {
      const current = next.getAll("category");
      next.delete("category");
      const remaining = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      remaining.forEach((item) => next.append("category", item));
    });

  const clearAll = () => {
    setDraft("");
    router.replace("/produse", { scroll: false });
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="w-full font-display text-2xl font-extrabold text-ink-900 sm:text-3xl lg:w-auto">
          Produse
        </h1>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            update((next) => {
              const value = draft.trim();
              if (value) next.set("q", value);
              else next.delete("q");
            });
          }}
          className="ml-auto w-full sm:w-72"
        >
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Caută un produs"
            aria-label="Caută produse"
            leading={<Icons.search aria-hidden="true" className="h-4 w-4" />}
          />
        </form>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {PRODUCT_CATEGORIES.map((category) => {
          const active = categories.includes(category.id);
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => toggleCategory(category.id)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-bold transition",
                active
                  ? "border-primary-500 bg-primary-50 text-primary-900"
                  : "border-line bg-white text-ink-700 hover:border-ink-300",
              )}
            >
              <span aria-hidden="true">{category.emoji}</span>
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="mb-3 hidden h-5 sm:block">
        {loading ? (
          <Skeleton className="h-5 w-32" />
        ) : (
          <p className="text-sm text-ink-500">
            {data?.total ?? 0} produse{q ? ` pentru „${q}”` : ""}
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
        <ProductGrid
          products={data?.items ?? []}
          loading={loading}
          skeletonCount={PAGINATION.DEFAULT_PAGE_SIZE}
          emptyState={
            <EmptyState
              title="Niciun produs pe filtrele astea"
              action={
                categories.length || q ? (
                  <Button onClick={clearAll}>Șterge filtrele</Button>
                ) : (
                  <ButtonLink href="/cont/anunturi/nou">
                    Listează un produs
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
    </>
  );
}
