"use client";

import Link from "next/link";
import { AuctionGrid } from "@/components/auctions/AuctionCard";
import { CauseGrid } from "@/components/causes/CauseCard";
import {
  AnimatedNumber,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
} from "@/components/ui";
import { getFeaturedAuctions } from "@/lib/api/auctions";
import { listTrendingCauses } from "@/lib/api/causes";
import { getPlatformStats } from "@/lib/api/stats";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import { formatMoney } from "@/lib/money";

/** A heading and its "see all" link. No explanatory subtitle. */
function RowHeader({
  id,
  title,
  href,
}: {
  id: string;
  title: string;
  href: string;
}) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2
        id={id}
        className="font-display text-xl font-extrabold text-ink-900 sm:text-2xl"
      >
        {title}
      </h2>
      <ButtonLink
        href={href}
        variant="link"
        size="sm"
        className="shrink-0 text-sm"
      >
        Vezi toate
      </ButtonLink>
    </div>
  );
}

/**
 * The impact figures, as one line rather than a row of tiles.
 * The total is the story; the rest are supporting detail, so they are sized
 * accordingly instead of each getting its own card.
 */
export function ImpactLine() {
  const { data } = useApi(() => getPlatformStats(), "platform-stats");

  /**
   * No skeleton here: the figures roll up from zero when they land. The row
   * reserves its height and the number reserves its width, so nothing around
   * it moves while it counts.
   */
  return (
    <div className="flex min-h-[4.25rem] flex-wrap content-start items-baseline gap-x-6 gap-y-1 text-left sm:min-h-[2.75rem]">
      <p className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
        <AnimatedNumber
          value={data?.totalRaised ?? 0}
          format={(value) => formatMoney(value, { compact: true })}
          minChars={9}
          className="text-primary-600"
        />{" "}
        strânși până acum
      </p>
      <p className="text-base text-ink-500">
        <AnimatedNumber
          value={data?.causeCount ?? 0}
          format={(value) => String(value)}
          className="font-bold text-ink-800"
        />{" "}
        cauze
        <span className="mx-2 text-ink-300">·</span>
        <AnimatedNumber
          value={data?.liveAuctionCount ?? 0}
          format={(value) => String(value)}
          className="font-bold text-ink-800"
        />{" "}
        licitații acum
      </p>
    </div>
  );
}

/** Both homepage rows come from one call; each renders on its own. */
function useFeatured() {
  const { user } = useAuth();
  return useApi(
    () => getFeaturedAuctions(user?.id),
    `featured:${user?.id ?? "anon"}`,
  );
}

export function EndingSoonRow() {
  const { data, loading, error, reload } = useFeatured();

  if (error) {
    return (
      <ErrorState
        title="Nu am putut încărca licitațiile"
        action={
          <Button variant="secondary" onClick={reload}>
            Încearcă din nou
          </Button>
        }
      />
    );
  }

  return (
    <>
      <section aria-labelledby="ending-soon">
        <RowHeader
          id="ending-soon"
          title="Se termină curând"
          href="/licitatii?endingSoon=1"
        />
        <AuctionGrid
          auctions={data?.endingSoon ?? []}
          loading={loading}
          skeletonCount={4}
          emptyState={
            <EmptyState
              title="Nimic pe final acum"
              action={<ButtonLink href="/licitatii">Vezi licitațiile</ButtonLink>}
              compact
            />
          }
        />
      </section>
    </>
  );
}

export function PopularRow() {
  const { data, loading } = useFeatured();

  return (
    <>
      <section aria-labelledby="popular">
        <RowHeader id="popular" title="Cele mai urmărite" href="/licitatii" />
        <AuctionGrid
          auctions={data?.popular ?? []}
          loading={loading}
          skeletonCount={8}
          emptyState={
            <EmptyState
              title="Nicio licitație activă"
              action={
                <ButtonLink href="/cont/anunturi/nou">Listează un produs</ButtonLink>
              }
              compact
            />
          }
        />
      </section>
    </>
  );
}

export function TrendingCauses() {
  const { data, loading, error, reload } = useApi(
    () => listTrendingCauses(),
    "trending-causes",
  );

  return (
    <section aria-labelledby="trending-causes">
      <RowHeader
        id="trending-causes"
        title="Aproape de obiectiv"
        href="/cauze"
      />

      {error ? (
        <ErrorState
          title="Nu am putut încărca cauzele"
          action={
            <Button variant="secondary" onClick={reload}>
              Încearcă din nou
            </Button>
          }
        />
      ) : (
        <CauseGrid
          causes={data ?? []}
          loading={loading}
          emptyState={
            <EmptyState
              title="Nicio cauză activă"
              action={<ButtonLink href="/cont/cauze/noua">Propune o cauză</ButtonLink>}
              compact
            />
          }
        />
      )}
    </section>
  );
}

/** Category shortcuts, sized for a thumb on mobile. */
export function CategoryRow({
  categories,
}: {
  categories: readonly { id: string; label: string; emoji: string }[];
}) {
  return (
    <section aria-labelledby="categories">
      <h2
        id="categories"
        className="mb-4 font-display text-xl font-extrabold text-ink-900 sm:text-2xl"
      >
        Categorii
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/licitatii?category=${category.id}`}
            className="flex items-center gap-2.5 rounded-2xl bg-white ring-1 ring-edge px-3.5 py-3 transition-transform hover:-translate-y-0.5"
          >
            <span aria-hidden="true" className="text-xl">
              {category.emoji}
            </span>
            <span className="min-w-0 truncate font-display font-bold text-ink-900">
              {category.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
