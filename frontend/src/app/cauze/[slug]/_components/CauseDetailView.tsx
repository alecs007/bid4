"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Icons } from "@/components/icons";
import { AuctionGrid } from "@/components/auctions/AuctionCard";
import {
  Avatar,
  ButtonLink,
  EmptyState,
  ErrorState,
  Select,
  Sheet,
  SkeletonCauseDetail,
} from "@/components/ui";
import { listAuctions } from "@/lib/api/auctions";
import { getCause } from "@/lib/api/causes";
import { CAUSE_CATEGORIES } from "@/lib/config";
import { formatMoney, progressPercent } from "@/lib/money";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import type { AuctionSort, AuctionStatus, CauseDetail } from "@/lib/types";
import { formatMemberSince } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

const SORTS: { value: AuctionSort; label: string }[] = [
  { value: "ENDING_SOON", label: "Se termină curând" },
  { value: "NEWEST", label: "Cele mai noi" },
  { value: "MOST_BIDS", label: "Cele mai licitate" },
  { value: "PRICE_DESC", label: "Preț descrescător" },
];

type StatusFilter = "ALL" | "LIVE" | "ENDED";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Toate" },
  { value: "LIVE", label: "Active" },
  { value: "ENDED", label: "Încheiate" },
];

const STATUS_MAP: Record<StatusFilter, AuctionStatus[] | undefined> = {
  ALL: undefined,
  LIVE: ["LIVE", "SCHEDULED"],
  ENDED: ["SOLD", "ENDED", "UNSOLD"],
};

function CauseHead({ cause }: { cause: CauseDetail }) {
  const frames = [cause.coverUrl, ...(cause.gallery ?? [])];
  const [active, setActive] = useState(0);

  const category = CAUSE_CATEGORIES.find((item) => item.id === cause.category);
  const percent = progressPercent(cause.raisedAmount, cause.goalAmount);
  const reached = percent >= 100;

  return (
    <section className="grid gap-5 lg:grid-cols-2 lg:gap-8">
      <div className="min-w-0">
        <div className="relative aspect-4/3 w-full overflow-hidden rounded-3xl bg-ink-100">
          <Image
            src={frames[active] ?? frames[0]!}
            alt={`${cause.name}, imaginea ${active + 1}`}
            fill
            unoptimized
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          {category ? (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1 text-sm font-bold text-ink-800 backdrop-blur-sm">
              <span aria-hidden="true">{category.emoji}</span>
              {category.label}
            </span>
          ) : null}
        </div>

        
        {frames.length > 1 ? (
          <div
            data-lenis-prevent
            className="-mx-4 mt-3 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          >
            {frames.map((frame, index) => (
              <button
                key={frame}
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Imaginea ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl transition sm:h-20 sm:w-20",
                  index === active
                    ? "ring-2 ring-primary-500"
                    : "opacity-60 hover:opacity-100",
                )}
              >
                <Image
                  src={frame}
                  alt=""
                  fill
                  unoptimized
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col">
        <h1 className="font-display text-2xl leading-tight font-extrabold text-ink-900 sm:text-4xl">
          {cause.name}
        </h1>
        <p className="mt-2.5 text-ink-600">{cause.shortDescription}</p>
        <div className="mt-6 flex items-baseline justify-between gap-3">
          <p className="numeric font-display text-3xl leading-none font-extrabold text-ink-900 sm:text-4xl">
            {formatMoney(cause.raisedAmount, { compact: true })}
          </p>
          <p
            className={cn(
              "numeric font-display text-lg font-extrabold",
              reached ? "text-success-600" : "text-primary-700",
            )}
          >
            {Math.round(percent)}%
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Strâns din obiectivul de ${formatMoney(cause.goalAmount)}`}
          className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-ink-100"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              reached ? "bg-success-500" : "bg-primary-500",
            )}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
          <div className="flex gap-1.5">
            <dt className="text-ink-500">Obiectiv</dt>
            <dd className="numeric font-bold text-ink-900">
              {formatMoney(cause.goalAmount, { compact: true })}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-500">Susținători</dt>
            <dd className="numeric font-bold text-ink-900">
              {cause.supporterCount}
            </dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-ink-500">Licitații active</dt>
            <dd className="numeric font-bold text-ink-900">
              {cause.activeAuctionCount}
            </dd>
          </div>
        </dl>
        <ButtonLink
          href={`/licitatii?causeId=${cause.id}`}
          size="lg"
          fullWidth
          className="mt-6 sm:w-auto"
        >
          Licitează pentru cauza asta
        </ButtonLink>
      </div>
    </section>
  );
}

export function CauseDetailView({ slug }: { slug: string }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [sort, setSort] = useState<AuctionSort>("ENDING_SOON");
  const [docsOpen, setDocsOpen] = useState(false);

  const { data: cause, loading, error } = useApi(
    () => getCause(slug),
    `cause:${slug}`,
  );

  const { data: auctions, loading: auctionsLoading } = useApi(
    () =>
      listAuctions(
        { causeId: cause?.id, status: STATUS_MAP[status], sort, pageSize: 24 },
        user?.id,
      ),
    `cause-auctions:${cause?.id ?? ""}:${status}:${sort}:${user?.id ?? "anon"}`,
    { enabled: Boolean(cause?.id) },
  );

  if (loading && !cause) return <SkeletonCauseDetail />;

  if (error || !cause) {
    return (
      <ErrorState
        title="Nu am găsit cauza"
        action={<ButtonLink href="/cauze">Vezi toate cauzele</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 sm:gap-10">
      <CauseHead cause={cause} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-8">
        <section className="min-w-0">
          <h2 className="mb-3 font-display text-xl font-extrabold text-ink-900">
            Povestea
          </h2>
          <div className="leading-relaxed whitespace-pre-line text-ink-700">
            {cause.story}
          </div>
        </section>
        <div className="flex min-w-0 flex-col gap-4">
          <section className="rounded-3xl bg-white p-5 ring-1 ring-edge">
            <div className="mb-3 flex items-center gap-2">
              <Icons.escrow
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-success-600"
              />
              <h2 className="font-display font-extrabold text-ink-900">
                Cauză verificată
              </h2>
            </div>
            <dl className="flex flex-col gap-2.5 text-[15px]">
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-ink-500">Entitate</dt>
                <dd className="min-w-0 truncate text-right font-bold text-ink-900">
                  {cause.validation.legalName || "Persoană fizică"}
                </dd>
              </div>
              {cause.validation.registrationNumber ? (
                <div className="flex justify-between gap-3">
                  <dt className="shrink-0 text-ink-500">CUI</dt>
                  <dd className="numeric font-bold text-ink-900">
                    {cause.validation.registrationNumber}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-ink-500">Reprezentant</dt>
                <dd className="min-w-0 truncate text-right font-bold text-ink-900">
                  {cause.validation.representativeName}
                </dd>
              </div>
            </dl>

            {cause.validation.documents.length > 0 ? (
              <button
                type="button"
                onClick={() => setDocsOpen(true)}
                className="mt-3 text-sm font-bold text-primary-700 hover:text-primary-800"
              >
                Vezi documentele ({cause.validation.documents.length})
              </button>
            ) : null}
          </section>
          <Link
            href={`/profil/${cause.organizer.username}`}
            className="group rounded-3xl bg-white p-5 ring-1 ring-edge transition-transform hover:-translate-y-0.5"
          >
            <p className="mb-3 text-sm font-bold text-ink-500">Organizator</p>
            <div className="flex items-center gap-3">
              <Avatar
                name={cause.organizer.displayName}
                src={cause.organizer.avatarUrl}
                accountType={cause.organizer.accountType}
                size="md"
                verified
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-bold text-ink-900 group-hover:text-primary-700">
                  {cause.organizer.displayName}
                </p>
                <p className="text-sm text-ink-500">
                  membru din {formatMemberSince(cause.organizer.createdAt)}
                </p>
              </div>
              <Icons.forward
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-ink-400"
              />
            </div>
          </Link>
        </div>
      </div>
      <section aria-labelledby="cause-auctions">
        <h2
          id="cause-auctions"
          className="mb-4 font-display text-xl font-extrabold text-ink-900 sm:text-2xl"
        >
          Licitații pentru cauză
        </h2>
        <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div
            role="tablist"
            aria-label="Filtrează licitațiile"
            className="flex gap-1 rounded-xl bg-white p-1 ring-1 ring-edge"
          >
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={status === tab.value}
                onClick={() => setStatus(tab.value)}
                className={cn(
                  "flex-1 rounded-lg px-3 py-2 text-sm font-bold whitespace-nowrap transition sm:flex-none",
                  status === tab.value
                    ? "bg-primary-600 text-white"
                    : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="sm:ml-auto sm:w-56">
            <Select
              ariaLabel="Sortează"
              size="sm"
              value={sort}
              options={SORTS}
              onChange={(next) => setSort((next || "ENDING_SOON") as AuctionSort)}
            />
          </div>
        </div>
        <AuctionGrid
          auctions={auctions?.items ?? []}
          loading={auctionsLoading}
          skeletonCount={4}
          emptyState={
            <EmptyState
              title={
                status === "LIVE"
                  ? "Nicio licitație activă acum"
                  : "Nicio licitație aici încă"
              }
              action={
                <ButtonLink href="/cont/anunturi/nou">Listează un produs</ButtonLink>
              }
              compact
            />
          }
        />
      </section>
      <Sheet
        open={docsOpen}
        onClose={() => setDocsOpen(false)}
        title="Documente de verificare"
      >
        <ul className="flex flex-col gap-2 pb-2">
          {cause.validation.documents.map((document) => (
            <li
              key={document.id}
              className="flex items-center gap-3 rounded-2xl bg-ink-50 p-3"
            >
              <Icons.invoice
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-ink-500"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-ink-900">
                  {document.fileName}
                </p>
                <p className="numeric text-sm text-ink-500">
                  {Math.round(document.sizeBytes / 1024)} KB
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-sm text-ink-500">
          Documentele sunt verificate de echipa bid4 înainte ca o cauză să
          primească licitații.
        </p>
      </Sheet>
    </div>
  );
}
