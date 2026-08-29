"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { CauseGrid } from "@/components/causes/CauseCard";
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  SearchField,
  Skeleton,
} from "@/components/ui";
import { listCauses } from "@/lib/api/causes";
import { CAUSE_CATEGORIES } from "@/lib/config";
import { useApi } from "@/lib/hooks/useApi";
import { countRo } from "@/lib/utils/plural";
import { cn } from "@/lib/utils/cn";

export function CauseBrowser() {
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const categories = params.getAll("category");

  const [navigating, startNavigation] = useTransition();

  const { data, loading, error, reload } = useApi(
    () =>
      listCauses({
        q: q || undefined,
        category: categories.length ? categories : undefined,
      }),
    `causes:${params.toString()}`,
  );

  const busy = navigating || loading;
  // As many placeholders as there were cards, so swapping one set for the other
  // does not resize the page under the reader.
  const outgoing = data?.length ?? 0;

  /**
   * The filter lives in the URL, and useSearchParams only catches up once the
   * router has finished navigating — about half a second. Until then the key has
   * not changed, nothing is loading, and the previous filter's results sit there
   * looking like an answer. Marking the navigation as a transition gives an
   * immediate `pending`, so the list can say it is working from the click rather
   * than from whenever the address bar agrees.
   */
  const update = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params.toString());
    mutate(next);
    const query = next.toString();
    startNavigation(() => {
      router.replace(query ? `/cauze?${query}` : "/cauze", { scroll: false });
    });
  };

  const toggleCategory = (id: string) =>
    update((next) => {
      const current = next.getAll("category");
      next.delete("category");
      const remaining = current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
      remaining.forEach((item) => next.append("category", item));
    });

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="w-full font-display text-2xl font-extrabold text-ink-900 sm:text-3xl lg:w-auto">
          Cauze
        </h1>
        <SearchField
          key={q}
          term={q}
          label="Caută în cauze"
          placeholder="Caută o cauză"
          className="ml-auto w-full sm:w-72"
          onSearch={(value) =>
            update((next) => {
              if (value) next.set("q", value);
              else next.delete("q");
            })
          }
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {CAUSE_CATEGORIES.map((category) => {
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
        {busy ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <p className="text-sm text-ink-500">
            {countRo(data?.length ?? 0, "cauză verificată", "cauze verificate")}
          </p>
        )}
      </div>

      {/* A floor under the results, so a page that finds one cause does not leave
          the footer halfway up the screen, and so swapping a tall set of rows
          for a short one moves the page once rather than collapsing it first. */}
      <div className="min-h-[60vh]">
      {error ? (
        <ErrorState
          action={
            <Button variant="secondary" onClick={reload}>
              Încearcă din nou
            </Button>
          }
        />
      ) : (
        <CauseGrid
          causes={data ?? []}
          loading={busy}
          skeletonCount={Math.min(Math.max(outgoing, 3), 12)}
          emptyState={
            <EmptyState
              title="Nicio cauză pe filtrele astea"
              description="Încearcă altă categorie sau propune chiar tu o cauză."
              action={<ButtonLink href="/cont/cauze/noua">Propune o cauză</ButtonLink>}
            />
          }
        />
      )}
      </div>
    </>
  );
}
