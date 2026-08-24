"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Icons } from "@/components/icons";
import {
  Avatar,
  Breadcrumbs,
  Gallery,
  Button,
  ButtonLink,
  ErrorState,
  ProgressBar,
  Sheet,
  SkeletonDetail,
  useToast,
} from "@/components/ui";
import { getAuction, toggleWatch } from "@/lib/api/auctions";
import { listBids } from "@/lib/api/bids";
import { FEES, PRODUCT_CATEGORIES } from "@/lib/config";
import { AUCTION_STATUS, PRODUCT_CONDITION } from "@/lib/labels";
import { computeFees, formatMoney, progressPercent } from "@/lib/money";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import { cn } from "@/lib/utils/cn";
import { BidBox } from "./BidBox";
import { RelatedAuctions } from "./RelatedAuctions";
import { BidHistory } from "./BidHistory";

function Block({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white ring-1 ring-edge p-5">
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

export function AuctionDetailView({ auctionId }: { auctionId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const [nonce, setNonce] = useState(0);
  const [feesOpen, setFeesOpen] = useState(false);

  const {
    data: auction,
    loading,
    error,
  } = useApi(
    () => getAuction(auctionId, user?.id),
    `auction:${auctionId}:${user?.id ?? "anon"}:${nonce}`,
  );

  const { data: bids, loading: bidsLoading } = useApi(
    () => listBids(auctionId),
    `bids:${auctionId}:${nonce}`,
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

  const refresh = () => setNonce((value) => value + 1);
  const category = PRODUCT_CATEGORIES.find(
    (item) => item.id === auction.product.category,
  );
  const fees = computeFees({
    finalPrice: auction.currentPrice,
    donationPercent: auction.donationPercent,
  });
  const causePercent = progressPercent(
    auction.cause.raisedAmount,
    auction.cause.goalAmount,
  );

  const handleWatch = async () => {
    if (!user) {
      toast.info("Intră în cont ca să salvezi licitații.");
      return;
    }
    const result = await toggleWatch(auction.id, user.id);
    toast.success(result.watched ? "Salvată" : "Scoasă din listă");
    refresh();
  };

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: auction.product.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Link copiat");
    } catch {}
  };

  const impact = (
    <div className="flex items-center gap-3 rounded-2xl bg-primary-50 px-4 py-3">
      <Icons.donation
        aria-hidden="true"
        className="h-5 w-5 shrink-0 text-primary-700"
      />
      <p className="min-w-0 flex-1 text-[15px] text-primary-900">
        <span className="numeric font-display font-extrabold">
          {formatMoney(fees.donationAmount, { compact: true })}
        </span>{" "}
        {auction.status === "LIVE" ? " din prețul de acum" : " din vânzare"}{" "}
        merg la{" "}
        <Link
          href={`/cauze/${auction.cause.slug}`}
          className="font-bold underline underline-offset-2 whitespace-nowrap"
        >
          {auction.cause.name}
        </Link>
      </p>
      <button
        type="button"
        onClick={() => setFeesOpen(true)}
        aria-label="Detalii despre împărțirea banilor"
        className="shrink-0 rounded-lg p-1 text-primary-700 transition hover:bg-primary-100"
      >
        <Icons.help aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );

  return (
    <div className="animate-reveal flex flex-col gap-4 pb-24 lg:pb-0">
      <Breadcrumbs
        items={[
          { label: "Acasă", href: "/" },
          { label: "Licitații", href: "/licitatii" },
          { label: auction.product.title },
        ]}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-6">
        <div className="min-w-0">
          <Gallery
            images={auction.product.images}
            alt={auction.product.title}
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary-100 px-2 py-1 text-sm font-extrabold text-primary-900">
                <Icons.donation aria-hidden="true" className="h-4 w-4" />
                {auction.donationPercent}% donație
              </span>
              {auction.status !== "LIVE" ? (
                <span className="rounded-lg bg-ink-100 px-2 py-1 text-sm font-bold text-ink-700">
                  {AUCTION_STATUS[auction.status].label}
                </span>
              ) : null}
              {auction.extensionCount > 0 ? (
                <span className="rounded-lg bg-sun-100 px-2 py-1 text-sm font-bold text-sun-900">
                  prelungită de {auction.extensionCount} ori
                </span>
              ) : null}
            </div>
            <h1 className="font-display text-2xl leading-tight font-extrabold text-ink-900 sm:text-3xl">
              {auction.product.title}
            </h1>
          </div>
          <BidBox
            auction={auction}
            onChanged={refresh}
            winnerName={
              bids?.find((bid) => bid.bidderId === auction.winnerId)
                ?.bidderDisplayName
            }
          />

          {impact}

          <div className="flex gap-2">
            <Button
              variant="secondary"
              fullWidth
              onClick={handleWatch}
              leftIcon={
                <Icons.watchlist
                  aria-hidden="true"
                  className={cn("h-4 w-4", auction.isWatched && "fill-current")}
                />
              }
            >
              {auction.isWatched ? "Salvată" : "Salvează"}
            </Button>
            <Button
              variant="secondary"
              fullWidth
              onClick={share}
              leftIcon={<Icons.share aria-hidden="true" className="h-4 w-4" />}
            >
              Distribuie
            </Button>
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-6">
        <div className="flex min-w-0 flex-col gap-4">
          <Block title="Descriere">
            <p className="leading-relaxed whitespace-pre-line text-ink-700">
              {auction.product.description}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-line pt-4 text-[15px]">
              <div>
                <dt className="text-ink-500">Stare</dt>
                <dd className="font-bold text-ink-900">
                  {PRODUCT_CONDITION[auction.product.condition]}
                </dd>
              </div>
              <div>
                <dt className="text-ink-500">Categorie</dt>
                <dd className="font-bold text-ink-900">{category?.label}</dd>
              </div>
            </dl>
          </Block>
          <Block title="Licitații">
            <BidHistory
              bids={bids}
              loading={bidsLoading}
              startingPrice={auction.startingPrice}
            />
          </Block>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <Link
            href={`/cauze/${auction.cause.slug}`}
            className="group rounded-3xl bg-white ring-1 ring-edge p-5 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-ink-100">
                <Image
                  src={auction.cause.imageUrl}
                  alt=""
                  fill
                  unoptimized
                  sizes="56px"
                  className="object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display font-extrabold text-ink-900 group-hover:text-primary-700">
                  {auction.cause.name}
                </p>
                <p className="numeric text-sm text-ink-500">
                  {formatMoney(auction.cause.raisedAmount, { compact: true })}{" "}
                  din {formatMoney(auction.cause.goalAmount, { compact: true })}
                </p>
              </div>
            </div>
            <ProgressBar
              value={causePercent}
              size="sm"
              className="mt-4"
              label={`${Math.round(causePercent)}% din obiectiv`}
            />
          </Link>
          <Link
            href={`/profil/${auction.seller.username}`}
            className="group rounded-3xl bg-white ring-1 ring-edge p-5 transition-transform hover:-translate-y-0.5"
          >
            <p className="mb-3 text-sm font-bold text-ink-500">Vândut de</p>
            <div className="flex items-center gap-3">
              <Avatar
                name={auction.seller.displayName}
                src={auction.seller.avatarUrl}
                accountType={auction.seller.accountType}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-ink-900 group-hover:text-primary-700">
                  {auction.seller.displayName}
                </p>
                <p className="text-sm text-ink-500">
                  <span className="numeric">
                    {auction.seller.rating.toFixed(1).replace(".", ",")}
                  </span>{" "}
                  din {auction.seller.ratingCount} evaluări
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
