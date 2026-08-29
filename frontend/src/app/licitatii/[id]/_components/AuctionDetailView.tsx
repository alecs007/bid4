"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Icons } from "@/components/icons";
import {
  Avatar,
  Breadcrumbs,
  Gallery,
  ButtonLink,
  InfoHint,
  ErrorState,
  ProgressBar,
  Sheet,
  SkeletonDetail,
  useToast,
} from "@/components/ui";
import { getAuction, toggleWatch } from "@/lib/api/auctions";
import { listBids } from "@/lib/api/bids";
import {
  FEES,
  ORDER,
  AUCTION_CATEGORIES,
  SHIPPING,
  SHIPPING_PRICES,
} from "@/lib/config";
import { ACCOUNT_TYPE, AUCTION_STATUS, ITEM_CONDITION } from "@/lib/labels";
import { computeFees, formatMoney, progressPercent } from "@/lib/money";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi, useRevalidate } from "@/lib/hooks/useApi";
import { cn } from "@/lib/utils/cn";
import { countRo } from "@/lib/utils/plural";
import { BidBox } from "./BidBox";
import { RelatedAuctions } from "./RelatedAuctions";
import { BidHistory } from "./BidHistory";

/** A hairline and a heading — the page is a document, not a stack of cards. */
function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-line pt-5", className)}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg font-extrabold text-ink-900">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-line py-2.5 last:border-b-0">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-bold text-ink-900">{value}</dd>
    </div>
  );
}

function SellerStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-2 py-2.5 text-center">
      <dt className="numeric font-display font-extrabold text-ink-900">
        {value}
      </dt>
      <dd className="text-xs leading-tight text-ink-500">{label}</dd>
    </div>
  );
}

export function AuctionDetailView({ auctionId }: { auctionId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const revalidate = useRevalidate();
  const [feesOpen, setFeesOpen] = useState(false);
  const [watchOverride, setWatchOverride] = useState<boolean | null>(null);

  const {
    data: auction,
    loading,
    error,
  } = useApi(
    () => getAuction(auctionId, user?.id),
    `auction:${auctionId}:${user?.id ?? "anon"}`,
  );

  const { data: bids, loading: bidsLoading } = useApi(
    () => listBids(auctionId),
    `bids:${auctionId}`,
  );

  if (loading && !auction) return <SkeletonDetail />;

  if (error || !auction) {
    return (
      <ErrorState
        title="Nu am găsit licitația"
        action={<ButtonLink href="/licitatii">Vezi licitațiile</ButtonLink>}
      />
    );
  }

  // A bid changes the listing, its history and the homepage rows, and none of
  // those know about each other. Naming the prefixes here keeps that knowledge
  // where the change happens.
  const refresh = () =>
    revalidate(
      `auction:${auctionId}`,
      `bids:${auctionId}`,
      "auctions:",
      "featured:",
    );
  const category = AUCTION_CATEGORIES.find(
    (item) => item.id === auction.category,
  );
  const fees = computeFees({
    finalPrice: auction.currentPrice,
    donationPercent: auction.donationPercent,
  });
  const watched = watchOverride ?? Boolean(auction.isWatched);
  const causePercent = progressPercent(
    auction.cause.raisedAmount,
    auction.cause.goalAmount,
  );

  /** The icon turns on the tap; the request only confirms it, or undoes it. */
  const handleWatch = async () => {
    if (!user) {
      toast.info("Intră în cont ca să salvezi licitații.");
      return;
    }

    const next = !watched;
    setWatchOverride(next);
    if (next) toast.success("Adăugat la salvate", auction.title);

    try {
      const result = await toggleWatch(auction.id, user.id);
      setWatchOverride(result.watched);
      refresh();
    } catch {
      setWatchOverride(!next);
      toast.error("Licitația nu a putut fi salvată.");
    }
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: auction.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copiat");
    } catch {}
  };

  /** A white chip while they float over the photograph, a hover surface beside the title. */
  const actionButton =
    "inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/95 ring-1 ring-edge backdrop-blur-sm transition duration-200 active:scale-90 lg:bg-transparent lg:ring-0 lg:backdrop-blur-none lg:hover:bg-ink-100";

  const actions = (
    <>
      <button
        type="button"
        onClick={handleWatch}
        aria-label={watched ? "Salvată" : "Salvează"}
        aria-pressed={watched}
        className={cn(
          actionButton,
          watched ? "text-primary-600" : "text-ink-600 hover:text-ink-900",
        )}
      >
        <Icons.watchlist
          aria-hidden="true"
          className={cn(
            "h-5 w-5 fill-transparent transition-[fill,transform] duration-200",
            watched && "scale-110 fill-current",
          )}
        />
      </button>
      <button
        type="button"
        onClick={share}
        aria-label="Distribuie"
        className={cn(actionButton, "text-ink-600 hover:text-ink-900")}
      >
        <Icons.share aria-hidden="true" className="h-5 w-5" />
      </button>
    </>
  );

  return (
    <div className="animate-reveal flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: "Acasă", href: "/" },
          { label: "Licitații", href: "/licitatii" },
          { label: auction.title },
        ]}
      />

      <div className="grid gap-x-12 gap-y-7 lg:grid-cols-[minmax(0,1fr)_21rem]">
        {/* Photographs, with the title above them on a desktop */}
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-1 lg:row-start-1">
          <div className="order-2 lg:order-1">
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-display text-2xl leading-tight font-extrabold text-ink-900 sm:text-3xl">
                {auction.title}
              </h1>
              <div className="hidden shrink-0 gap-1 lg:flex">{actions}</div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-ink-600">
              <span className="inline-flex items-center gap-1.5 font-bold text-primary-800">
                <Icons.donation aria-hidden="true" className="h-4 w-4" />
                {auction.donationPercent}% donație
              </span>
              <span aria-hidden="true" className="text-ink-300">
                &middot;
              </span>
              {category ? (
                <span className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="relative h-4 w-4 shrink-0">
                    <Image
                      src={`/images/illustrations/categories/${category.id}.webp`}
                      alt=""
                      fill
                      sizes="16px"
                      unoptimized
                      className="object-contain"
                    />
                  </span>
                  {category.label}
                </span>
              ) : null}
              <span aria-hidden="true" className="text-ink-300">
                &middot;
              </span>
              <span>{ITEM_CONDITION[auction.condition]}</span>
              {auction.status !== "LIVE" ? (
                <span className="rounded-lg bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-700">
                  {AUCTION_STATUS[auction.status].label}
                </span>
              ) : null}
              {auction.extensionCount > 0 ? (
                <span className="rounded-lg bg-sun-100 px-2 py-0.5 text-xs font-bold text-sun-900">
                  prelungită de {auction.extensionCount} ori
                </span>
              ) : null}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <Gallery
              images={auction.images}
              alt={auction.title}
              actions={actions}
            />
          </div>
        </div>

        {/* One box: clock, price, cause, bids, costs, payment */}
        <aside className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="rounded-xl bg-white ring-1 ring-edge">
            <BidBox
              auction={auction}
              onChanged={refresh}
              winnerName={
                bids?.find((bid) => bid.bidderId === auction.winnerId)
                  ?.bidderDisplayName
              }
            />

            <Link
              href={`/cauze/${auction.cause.slug}`}
              className="group flex items-center gap-3 border-t border-line px-5 py-4.5 transition hover:bg-primary-50"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                <Image
                  src={auction.cause.imageUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="40px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink-700">
                  <span className="numeric font-extrabold text-primary-800">
                    {formatMoney(fees.donationAmount, { compact: true })}
                  </span>{" "}
                  merg la{" "}
                  <span className="font-bold group-hover:underline">
                    {auction.cause.name}
                  </span>
                </p>
                <ProgressBar
                  value={causePercent}
                  size="sm"
                  className="mt-1.5"
                  label={`${Math.round(causePercent)}% din obiectivul cauzei`}
                />
              </div>
            </Link>

            <div className="border-t border-line px-5 py-4.5">
              <div className="mb-3 flex items-center gap-4 text-sm text-ink-600">
                <span className="inline-flex items-center gap-1.5">
                  <Icons.auction
                    aria-hidden="true"
                    className="h-4 w-4 text-ink-400"
                  />
                  <span className="numeric font-bold text-ink-900">
                    {countRo(auction.bidCount, "ofertă", "oferte")}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icons.watchlist
                    aria-hidden="true"
                    className="h-4 w-4 text-ink-400"
                  />
                  <span className="numeric font-bold text-ink-900">
                    {auction.watcherCount}
                  </span>{" "}
                  urmăritori
                </span>
              </div>

              <BidHistory
                bids={bids}
                loading={bidsLoading}
                startingPrice={auction.startingPrice}
              />
            </div>

            <div className="border-t border-line px-5 py-4.5 text-sm">
              <p className="mb-2 font-display text-sm font-extrabold text-ink-900">
                Alte costuri
              </p>
              <div className="flex items-start gap-2.5 py-1.5">
                <Icons.escrow
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-ink-400"
                />
                <span className="min-w-0 flex-1 text-ink-600">
                  Protecția cumpărătorului
                </span>
                <span className="numeric shrink-0 font-bold text-ink-900">
                  {FEES.BUYER_TAX_PERCENT}%
                </span>
                <InfoHint label="Ce include protecția cumpărătorului">
                  {FEES.BUYER_TAX_PERCENT}% din prețul final, între{" "}
                  {formatMoney(FEES.BUYER_TAX_MIN, { compact: true })} și{" "}
                  {formatMoney(FEES.BUYER_TAX_MAX, { compact: true })}. Ține
                  banii la bid4 până confirmi coletul și acoperă disputele
                  deschise în {ORDER.DISPUTE_WINDOW_HOURS} de ore de la livrare.
                </InfoHint>
              </div>
              <div className="flex items-start gap-2.5 py-1.5">
                <Icons.delivery
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-ink-400"
                />
                <span className="min-w-0 flex-1 text-ink-600">
                  Livrare {SHIPPING.COURIER_NAME}
                </span>
                <span className="numeric shrink-0 font-bold text-ink-900">
                  de la{" "}
                  {formatMoney(SHIPPING_PRICES.EASYBOX, { compact: true })}
                </span>
                <InfoHint label="Cum se calculează livrarea">
                  {formatMoney(SHIPPING_PRICES.EASYBOX, { compact: true })} la
                  Easybox,{" "}
                  {formatMoney(SHIPPING_PRICES.HOME_COURIER, { compact: true })}{" "}
                  cu livrare la adresă. Alegi metoda la finalizarea comenzii,
                  iar AWB-ul se generează automat după plată.
                </InfoHint>
              </div>
              <button
                type="button"
                onClick={() => setFeesOpen(true)}
                className="mt-1.5 text-sm font-bold text-primary-700 underline underline-offset-4"
              >
                Cum se împart banii
              </button>
            </div>

            <div className="border-t border-line px-5 py-4.5">
              <p className="mb-2 font-display text-sm font-extrabold text-ink-900">
                Opțiuni de plată
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Visa", "Mastercard", "Amex"].map((brand) => (
                  <span
                    key={brand}
                    className="rounded-lg bg-ink-100 px-2 py-1 text-xs font-bold text-ink-700"
                  >
                    {brand}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* The long read */}
        <div className="flex min-w-0 flex-col gap-6 lg:col-start-1 lg:row-start-2">
          <Section title="Descriere" className="border-t-0 pt-0">
            <p className="leading-relaxed whitespace-pre-line text-ink-700">
              {auction.description}
            </p>
          </Section>

          <Section title="Detalii">
            <dl className="grid gap-x-8 sm:grid-cols-2">
              <Spec label="Stare" value={ITEM_CONDITION[auction.condition]} />
              <Spec label="Categorie" value={category?.label} />
            </dl>
          </Section>

          <Section title="Vândut de">
            <Link
              href={`/profil/${auction.seller.username}`}
              className="group flex min-w-0 items-center gap-3"
            >
              <Avatar
                name={auction.seller.displayName}
                src={auction.seller.avatarUrl}
                accountType={auction.seller.accountType}
                size="md"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1 font-display text-lg font-extrabold text-ink-900 group-hover:text-primary-700">
                  {auction.seller.displayName}
                  <Icons.crumb
                    aria-hidden="true"
                    className="h-4 w-4 text-ink-400"
                  />
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5">
                  {auction.seller.city ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-700">
                      <Icons.locker aria-hidden="true" className="h-3 w-3" />
                      {auction.seller.city}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 rounded-lg bg-primary-100 px-2 py-0.5 text-xs font-bold text-primary-900">
                    <Icons.check aria-hidden="true" className="h-3 w-3" />
                    {ACCOUNT_TYPE[auction.seller.accountType]}
                  </span>
                </span>
              </span>
            </Link>

            <dl className="mt-3 grid grid-cols-3 divide-x divide-line rounded-2xl ring-1 ring-edge">
              <SellerStat
                value={auction.seller.rating.toFixed(1).replace(".", ",")}
                label="rating"
              />
              <SellerStat
                value={String(auction.seller.ratingCount)}
                label={countRo(
                  auction.seller.ratingCount,
                  "evaluare",
                  "evaluări",
                )}
              />
              <SellerStat
                value={formatMoney(auction.seller.totalRaised, {
                  compact: true,
                })}
                label="strânși pentru cauze"
              />
            </dl>
          </Section>
        </div>
      </div>

      <RelatedAuctions
        auctionId={auction.id}
        causeName={auction.cause.name}
        causeSlug={auction.cause.slug}
      />

      <Sheet
        open={feesOpen}
        onClose={() => setFeesOpen(false)}
        title="Cum se împart banii"
      >
        <dl className="flex flex-col gap-3 pb-2 text-[15px]">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-600">Preț curent</dt>
            <dd className="numeric font-bold text-ink-900 whitespace-nowrap">
              {formatMoney(auction.currentPrice)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-600">
              Donație către {auction.cause.name} ({auction.donationPercent}%)
            </dt>
            <dd className="numeric font-bold text-primary-700 whitespace-nowrap">
              {formatMoney(fees.donationAmount)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-ink-600">Suma rămasă vânzătorului</dt>
            <dd className="numeric font-bold text-ink-900 whitespace-nowrap">
              {formatMoney(fees.sellerNet)}
            </dd>
          </div>
          <p className="mt-2 border-t border-line pt-3 text-sm text-ink-500">
            La final se adaugă livrarea și taxa platformei de{" "}
            {FEES.BUYER_TAX_PERCENT}
            %, între{" "}
            <span className="whitespace-nowrap">
              {formatMoney(FEES.BUYER_TAX_MIN, { compact: true })}
            </span>{" "}
            și{" "}
            <span className="whitespace-nowrap">
              {formatMoney(FEES.BUYER_TAX_MAX, { compact: true })}
            </span>
            . Detaliile sunt afișate înainte de a confirma comanda.
          </p>
        </dl>
      </Sheet>
    </div>
  );
}
