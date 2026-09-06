"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Icons } from "@/components/icons";
import { CauseGrid } from "@/components/causes/CauseCard";
import {
  Button,
  ButtonLink,
  CategoryIcon,
  EmptyState,
  ErrorState,
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
      {/* No search of its own any more: the one in the header searches the
          whole site, and two boxes on the same page asking for the same thing
          is a choice nobody wanted to make. */}
      <div className="mb-4 flex items-center gap-2">
        <h1 className="font-display flex items-center gap-2 text-2xl font-extrabold text-ink-900 sm:text-3xl">
          {/* The same mark an organiser wears when they are verified: the same
              check, at the same weight, on the same green. A page titled for
              verified causes should carry the badge those causes' organisers
              carry, not a second design of it. */}
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success-600 text-white sm:h-6 sm:w-6">
            <Icons.check
              aria-hidden="true"
              strokeWidth={4}
              className="h-3 w-3 sm:h-4 sm:w-4"
            />
          </span>
          Cauze verificate
        </h1>
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
              <CategoryIcon set="causes" id={category.id} className="h-4 w-4" />
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="mb-3 h-5">
        {busy ? (
          <Skeleton className="h-5 w-40" />
        ) : (
          <p className="text-sm text-ink-500">
            {/* Not "verificate" twice: the heading has just said that. */}
            {countRo(
              data?.length ?? 0,
              "cauză înregistrată",
              "cauze înregistrate",
            )}
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
                title="Nicio cauză găsită"
                description="Încearcă altă categorie sau propune chiar tu o cauză."
                action={
                  <ButtonLink href="/cont/cauze/noua">
                    Propune o cauză
                  </ButtonLink>
                }
              />
            }
          />
        )}
      </div>
    </>
  );
}
