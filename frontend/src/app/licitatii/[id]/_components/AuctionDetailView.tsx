"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Icons } from "@/components/icons";
import {
  Avatar,
  Breadcrumbs,
  ButtonLink,
  CategoryIcon,
  ErrorState,
  Button,
  Gallery,
  Illustration,
  InfoHint,
  Modal,
  ProgressBar,
  Sheet,
  SkeletonDetail,
  StatTile,
  StatTiles,
  useToast,
  VerifiedTag,
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
import { AUCTION_STATUS, ITEM_CONDITION } from "@/lib/labels";
import { computeFees, formatMoney, progressPercent } from "@/lib/money";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi, useRevalidate } from "@/lib/hooks/useApi";
import { formatRelativeRo } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";
import { countRo, pluralRo } from "@/lib/utils/plural";
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

const MARK_TONE = {
  primary: "bg-primary-500/10",
  neutral: "bg-ink-500/10",
} as const;

/**
 * Size and padding travel together rather than being passed in separately: a
 * caller free to choose both would eventually pick a pair whose ring does not
 * match the rest. The large badge carries a proportionally tighter ring than the
 * two small ones, which is deliberate — a ring held to the same share of an 88px
 * disc reads as far heavier than it does at 28px.
 */
const MARK_SIZE = {
  sm: "h-7 w-7 p-[6px]",
  md: "h-10 w-10 p-2",
  lg: "h-22 w-22 p-3",
} as const;

/** A mark on its own tint: the shield, and the courier icon beside it. */
function CostMark({
  size,
  tone = "primary",
  className,
  children,
}: {
  size: keyof typeof MARK_SIZE;
  tone?: keyof typeof MARK_TONE;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full",
        MARK_SIZE[size],
        MARK_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function AuctionDetailView({ auctionId }: { auctionId: string }) {
  const { user } = useAuth();
  const toast = useToast();
  const revalidate = useRevalidate();
  const [feesOpen, setFeesOpen] = useState(false);
  const [protectionOpen, setProtectionOpen] = useState(false);
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
  const deliveryEta = `în ${SHIPPING.DELIVERY_DAYS_MIN}-${SHIPPING.DELIVERY_DAYS_MAX} zile lucrătoare`;
  const watched = watchOverride ?? Boolean(auction.isWatched);
  const causePercent = progressPercent(
    auction.cause.raisedAmount,
    auction.cause.goalAmount,
  );

  /** The icon turns on the tap; the request only confirms it, or undoes it. */
  const handleWatch = async () => {
    if (!user) {
      toast.info("Intră în cont pentru a urmări licitații.");
      return;
    }

    const next = !watched;
    setWatchOverride(next);
    if (next) toast.success("Adăugat la urmărite", auction.title);

    try {
      const result = await toggleWatch(auction.id, user.id);
      setWatchOverride(result.watched);
      refresh();
    } catch {
      setWatchOverride(!next);
      toast.error("Licitația nu a putut fi urmărită.");
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
        <Icons.share aria-hidden="true" className="h-5 w-5 shrink-0" />
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
                <Icons.donation
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0"
                />
                {auction.donationPercent}% donație
              </span>
              <span aria-hidden="true" className="text-ink-300">
                &middot;
              </span>
              {category ? (
                <span className="inline-flex items-center gap-1.5">
                  <CategoryIcon
                    set="categories"
                    id={category.id}
                    className="h-4 w-4"
                  />
                  {category.label}
                </span>
              ) : null}
              <span aria-hidden="true" className="text-ink-300">
                &middot;
              </span>
              <span>{ITEM_CONDITION[auction.condition]}</span>
              <span aria-hidden="true" className="text-ink-300">
                &middot;
              </span>
              {/* How old the listing is belongs with the rest of what it is,
                  not stranded in a heading further down the page. */}
              <span>Publicat {formatRelativeRo(auction.createdAt)}</span>
              {/* Reserved is left unmarked on purpose. The listing still takes
                  offers, and the acceptance is the seller's business and the
                  buyer's — badging it here would announce a private decision
                  and put a discouraging label on something still open. */}
              {auction.status !== "LIVE" && auction.status !== "RESERVED" ? (
                <span className="rounded-lg bg-ink-100 px-2 py-0.5 text-xs font-bold text-ink-700">
                  {AUCTION_STATUS[auction.status].label}
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

            <div className="border-t border-line">
              <Link
                href={`/cauze/${auction.cause.slug}`}
                className="group flex items-center gap-3 px-5 pt-4.5 pb-3"
              >
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-ink-100">
                  <Image
                    src={auction.cause.imageUrl}
                    alt=""
                    fill
                    unoptimized
                    sizes="40px"
                    className="object-cover"
                    draggable={false}
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
              <button
                type="button"
                onClick={() => setFeesOpen(true)}
                className="px-5 pb-4 text-sm font-bold text-primary-700 underline underline-offset-4 hover:text-primary-800"
              >
                Cum se împart banii?
              </button>
            </div>

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
              <div className="flex items-center gap-1.5 py-1.5">
                <CostMark size="sm">
                  <Illustration
                    src="shield-check"
                    className="h-full w-full"
                    sizes="14px"
                  />
                </CostMark>
                {/* `min-w-fit` is what holds the promise that this never breaks
                    over two lines: it may grow to push the figure right, but it
                    cannot be shrunk under its own text and re-wrapped. */}
                <span className="min-w-fit flex-1 whitespace-nowrap text-primary-800 text-sm sm:text-xs font-semibold">
                  Protecția cumpărătorului
                </span>
                {/* A rule rather than a price, so it takes the smaller size:
                    that is what buys the long label its single line. */}
                <span className="numeric shrink-0 text-xs font-bold whitespace-nowrap text-ink-900">
                  {FEES.BUYER_TAX_PERCENT}% +{" "}
                  {formatMoney(FEES.BUYER_TAX_FIXED, { compact: true })}
                </span>
                <InfoHint label="Ce include protecția cumpărătorului">
                  Taxa de protecție este de {FEES.BUYER_TAX_PERCENT}% din prețul
                  final + {formatMoney(FEES.BUYER_TAX_FIXED, { compact: true })}
                  . Banii tăi sunt păstrați în siguranță până când confirmi
                  comanda, iar reclamațiile trimise în primele{" "}
                  {ORDER.DISPUTE_WINDOW_HOURS} de ore după livrare sunt
                  acoperite integral.
                </InfoHint>
              </div>
              <div className="flex items-start gap-2.5 py-1.5">
                <CostMark size="sm" tone="neutral">
                  <Icons.delivery
                    aria-hidden="true"
                    className="h-full w-full text-ink-500"
                  />
                </CostMark>
                <span className="min-w-0 flex-1">
                  <span className="block text-ink-600 text-sm sm:text-xs">
                    Livrare {SHIPPING.COURIER_NAME}
                  </span>
                  <span className="block text-xs sm:text-[10px] text-ink-500">
                    {deliveryEta}
                  </span>
                </span>
                <span className="numeric shrink-0 font-bold text-ink-900 text-xs">
                  de la{" "}
                  {formatMoney(SHIPPING_PRICES.EASYBOX, { compact: true })}
                </span>
                <InfoHint label="Cum se calculează livrarea">
                  Coletul tău este livrat de {SHIPPING.COURIER_NAME}{" "}
                  {deliveryEta} după expediere. Alegi metoda de livrare la
                  finalizarea comenzii:{" "}
                  {formatMoney(SHIPPING_PRICES.EASYBOX, {
                    compact: true,
                  })}{" "}
                  la Easybox sau{" "}
                  {formatMoney(SHIPPING_PRICES.HOME_COURIER, { compact: true })}{" "}
                  la adresa ta. AWB-ul este generat automat după confirmarea
                  plății.
                </InfoHint>
              </div>
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

          {/* Deliberately outside the box above. That one is about this
              listing — what it costs, who gets the money. This is about the
              platform, and it says the same thing on every page. */}
          <div className="mt-3 flex items-start gap-3 rounded-xl bg-white p-4 ring-1 ring-edge">
            <CostMark size="md">
              <Illustration
                src="shield-check"
                className="h-full w-full"
                sizes="32px"
              />
            </CostMark>
            <div className="min-w-0">
              <p className="font-display text-sm font-extrabold text-ink-900">
                Cumpără și vinde în siguranță
              </p>
              <p className="mt-1 text-sm leading-relaxed text-ink-600">
                Fiecare achiziție beneficiază de politica noastră de rambursare,
                de tranzacții securizate și de asistență dedicată.{" "}
                <button
                  type="button"
                  onClick={() => setProtectionOpen(true)}
                  className="font-bold text-primary-700 underline underline-offset-4 hover:text-primary-800"
                >
                  Vezi detalii
                </button>
              </p>
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
                      <Icons.locker
                        aria-hidden="true"
                        className="h-3 w-3 shrink-0"
                      />
                      {auction.seller.city}
                    </span>
                  ) : null}
                  <VerifiedTag user={auction.seller} />
                </span>
              </span>
            </Link>

            {/* Three cards rather than one panel split by hairlines: each
                figure carries its own mark now, and a divider between two
                illustrations reads as a seam rather than a separation. */}
            <StatTiles className="mt-4">
              <StatTile
                illustration="rating"
                value={auction.seller.rating.toFixed(1).replace(".", ",")}
                label="rating"
              />
              <StatTile
                illustration="reviews-count"
                value={String(auction.seller.ratingCount)}
                label={pluralRo(
                  auction.seller.ratingCount,
                  "evaluare",
                  "evaluări",
                )}
              />
              <StatTile
                illustration="amount-donated"
                value={formatMoney(auction.seller.totalRaised, {
                  compact: true,
                })}
                label="donații"
              />
            </StatTiles>
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
            La final se adaugă livrarea și taxa de protecție a cumpărătorului,
            de {FEES.BUYER_TAX_PERCENT}% din prețul final +{" "}
            <span className="whitespace-nowrap">
              {formatMoney(FEES.BUYER_TAX_FIXED, { compact: true })}
            </span>
            . Toate costurile sunt afișate înainte de confirmarea comenzii.
          </p>
        </dl>
      </Sheet>

      <Modal
        open={protectionOpen}
        onClose={() => setProtectionOpen(false)}
        align="center"
        showClose={false}
        title={
          <span className="flex flex-col items-center gap-3 text-center">
            <CostMark size="lg">
              <Illustration
                src="shield-check"
                className="h-full w-full"
                sizes="68px"
              />
            </CostMark>
            Protecția cumpărătorului
          </span>
        }
        footer={
          <Button onClick={() => setProtectionOpen(false)}>Am înțeles</Button>
        }
      >
        <div className="flex flex-col gap-5 text-sm">
          <p className="leading-relaxed text-ink-600">
            Pentru fiecare achiziție efectuată pe bid4, ne asigurăm că ești
            protejat.
          </p>

          <ProtectionPoint
            icon={<Icons.wallet aria-hidden="true" className="h-5 w-5" />}
            title="Politica de rambursare"
          >
            <p>Poți primi rambursarea în cazul în care comanda:</p>
            <ul className="mt-1.5 flex list-disc flex-col gap-1 pl-5">
              <li>nu a fost expediată deloc sau s-a pierdut</li>
              <li>a sosit deteriorată</li>
              <li>este neconformă cu descrierea.</li>
            </ul>
            <p className="mt-2.5">
              Ai la dispoziție{" "}
              <strong className="font-bold text-ink-900">
                {ORDER.DISPUTE_WINDOW_HOURS} de ore pentru a trimite o
                reclamație
              </strong>{" "}
              după ce primești notificarea că articolul a fost livrat, chiar
              dacă acesta nu a sosit. Cumpărătorii suportă costul returnării
              unui articol, dacă nu există alt acord.
            </p>
          </ProtectionPoint>

          <ProtectionPoint
            icon={<Icons.secure aria-hidden="true" className="h-5 w-5" />}
            title="Tranzacții securizate"
          >
            <p>
              Banii tăi sunt păstrați în siguranță pe toată durata tranzacției.
              Nu îi vom elibera vânzătorului până când nu primești comanda și
              confirmi că totul este în regulă. Dacă nu primim un răspuns, îi
              eliberăm automat după {ORDER.AUTO_RELEASE_HOURS} de ore.
            </p>
            <p className="mt-2.5">
              Plățile sunt criptate de către partenerul nostru de plată, astfel
              încât banii tăi sunt întotdeauna trimiși și primiți în siguranță.{" "}
              <strong className="font-bold text-ink-900">
                Vânzătorul nu va vedea niciodată detaliile tale de plată.
              </strong>
            </p>
          </ProtectionPoint>

          <ProtectionPoint
            icon={<Icons.help aria-hidden="true" className="h-5 w-5" />}
            title="Asistența noastră"
          >
            <p>
              Contactează oricând echipa noastră de asistență, îți stă la
              dispoziție pentru a-ți oferi ajutor.
            </p>
          </ProtectionPoint>
        </div>
      </Modal>
    </div>
  );
}

/** One promise in the protection modal: a marker, a heading, and the detail. */
function ProtectionPoint({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
        {icon}
      </span>
      <div className="min-w-0 leading-relaxed text-ink-600">
        <p className="font-display font-extrabold text-ink-900">{title}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
