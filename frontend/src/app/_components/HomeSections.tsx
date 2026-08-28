"use client";

import Link from "next/link";
import Image from "next/image";
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
import { formatMoney, lei } from "@/lib/money";

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
 * What the counter shows until the real total arrives, and what the odometer
 * rolls up from. The smallest sum of the same width, never a bare "0": the digits
 * are tabular, so the sentence after it never reflows.
 */
const RAISED_PLACEHOLDER = formatMoney(lei(10_000), { compact: true });

const COUNT_PLACEHOLDER = "0";
/** Two characters holds both "8" and "12" without nudging the word after it. */
// const COUNT_CHARS = 2;

function Count({ value }: { value: number | null }) {
  if (value === null) {
    return (
      <span
        aria-hidden="true"
        className="numeric inline-block font-bold text-ink-300"
        // style={{ minWidth: `${COUNT_CHARS}ch` }}
      >
        {COUNT_PLACEHOLDER}
      </span>
    );
  }

  // Read, not watched: it appears as it is and only rolls if it changes.
  return (
    <AnimatedNumber
      value={value}
      format={(count) => String(count)}
      //  minChars={COUNT_CHARS}
      animateOnMount={false}
      className="font-bold text-ink-800"
    />
  );
}

export function ImpactLine() {
  const { data } = useApi(() => getPlatformStats(), "platform-stats");

  return (
    <div className="flex min-h-[4.25rem] flex-wrap content-start items-baseline gap-x-6 gap-y-1 text-left sm:min-h-[2.75rem]">
      <p className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
        {data ? (
          <AnimatedNumber
            value={data.totalRaised}
            format={(value) => formatMoney(value, { compact: true })}
            className="text-primary-600"
          />
        ) : (
          <span aria-hidden="true" className="numeric text-primary-300">
            {RAISED_PLACEHOLDER}
          </span>
        )}{" "}
        strânși până acum
      </p>
      <p className="text-base text-ink-500">
        <Count value={data?.causeCount ?? null} /> cauze susținute
        <span className="mx-2 text-ink-300">·</span>
        <Count value={data?.liveAuctionCount ?? null} /> licitații în
        desfășurare
      </p>
    </div>
  );
}

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
        title="Licitațiile nu au putut fi încărcate"
        action={
          <Button variant="secondary" onClick={reload}>
            Reîncarcă
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
          title="Aproape de final 🔥"
          href="/licitatii?endingSoon=1"
        />
        <AuctionGrid
          auctions={data?.endingSoon ?? []}
          loading={loading}
          skeletonCount={4}
          emptyState={
            <EmptyState
              title="Nicio licitație aproape de final"
              action={
                <ButtonLink href="/licitatii">
                  Explorează licitațiile
                </ButtonLink>
              }
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
              title="Nicio licitație în desfășurare"
              action={
                <ButtonLink href="/cont/anunturi/nou">Vinde acum</ButtonLink>
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
          title="Cauzele nu au putut fi încărcate"
          action={
            <Button variant="secondary" onClick={reload}>
              Reîncarcă
            </Button>
          }
        />
      ) : (
        <CauseGrid
          causes={data ?? []}
          loading={loading}
          emptyState={
            <EmptyState
              title="Nicio cauză activă momentan"
              action={
                <ButtonLink href="/cont/cauze/noua">
                  Deschide o cauză
                </ButtonLink>
              }
              compact
            />
          }
        />
      )}
    </section>
  );
}

export function CategoryRow({
  categories,
}: {
  categories: readonly {
    id: string;
    label: string;
    emoji?: string;
    icon?: string;
  }[];
}) {
  return (
    <section aria-labelledby="categories">
      <h2
        id="categories"
        className="mb-4 font-display text-xl font-extrabold text-ink-900 sm:text-2xl"
      >
        Categorii
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/licitatii?category=${category.id}`}
            className="group flex flex-col items-center justify-between rounded-2xl bg-white p-5 text-center ring-1 ring-edge transition-all hover:-translate-y-0.5 hover:ring-primary-500"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden sm:h-20 sm:w-20">
              <Image
                src={`/images/illustrations/categories/${category.id}.svg`}
                alt={`${category.label} illustration`}
                fill
                priority
                className="object-contain scale-104"
              />
            </div>

            <span className="mt-4 font-display text-base font-extrabold text-ink-900 group-hover:text-primary-600">
              {category.label}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
