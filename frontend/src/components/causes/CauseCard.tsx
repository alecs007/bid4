import Image from "next/image";
import Link from "next/link";

import { Icons } from "@/components/icons";
import { Skeleton } from "@/components/ui";
import { formatMoney, progressPercent } from "@/lib/money";
import type { CauseDetail } from "@/lib/types";
import { revealDelay } from "@/lib/utils/reveal";
import { cn } from "@/lib/utils/cn";

export function CauseCard({
  cause,
  className,
  style,
}: {
  cause: CauseDetail;
  className?: string;
  style?: React.CSSProperties;
}) {
  const percent = progressPercent(cause.raisedAmount, cause.goalAmount);
  const reached = percent >= 100;

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-3xl bg-white ring-1 ring-edge p-2 transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
      style={style}
    >
      {/* The whole card is the target. Not the title's own overlay, the way the
          auction card does it: the title sits inside a positioned caption. */}
      <Link
        href={`/cauze/${cause.slug}`}
        aria-label={cause.name}
        className="absolute inset-0 z-10 rounded-3xl"
      />

      <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-ink-100">
        <Image
          src={cause.imageUrl}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          // Same fade as the auction card: the grey box is the placeholder and
          // the photo arrives over it. See AuctionCard for why onLoad is safe
          // for a cached image.
          onLoad={(event) =>
            event.currentTarget.setAttribute("data-loaded", "true")
          }
          className="object-cover opacity-0 [transition:opacity_220ms_ease-out,transform_500ms,translate_500ms,scale_500ms,rotate_500ms] group-hover:scale-[1.04] data-[loaded=true]:opacity-100"
          draggable={false}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-900/85 via-ink-900/35 to-transparent"
        />

        {cause.activeAuctionCount > 0 ? (
          <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-2.5 py-1 text-sm font-bold text-white">
            <Icons.auction aria-hidden="true" className="h-4 w-4 shrink-0" />
            {cause.activeAuctionCount}
          </span>
        ) : null}

        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="font-display text-xl leading-tight font-extrabold text-white sm:text-2xl">
            <span className="line-clamp-2">{cause.name}</span>
          </p>
        </div>
      </div>
      <div className="px-3 pt-4 pb-3">
        <div className="flex items-baseline justify-between gap-3">
          <span className="numeric font-display text-2xl leading-none font-extrabold text-ink-900">
            {formatMoney(cause.raisedAmount, { compact: true })}
          </span>
          <span
            className={cn(
              "numeric font-display text-base font-extrabold",
              reached ? "text-success-600" : "text-primary-700",
            )}
          >
            {Math.round(percent)}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={Math.round(percent)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Strâns din obiectivul de ${formatMoney(cause.goalAmount)}`}
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink-100"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-700 ease-out",
              reached ? "bg-success-500" : "bg-primary-500",
            )}
            style={{ width: `${Math.min(100, percent)}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-ink-500">
          din {formatMoney(cause.goalAmount, { compact: true })}
          {cause.supporterCount > 0
            ? ` · ${cause.supporterCount} susținători`
            : ""}
        </p>
      </div>
    </article>
  );
}

export function SkeletonCauseCard() {
  return (
    <div className="rounded-3xl bg-white ring-1 ring-edge p-2">
      <Skeleton className="aspect-4/3 w-full rounded-2xl" />
      <div className="px-3 pt-4 pb-3">
        {/* The real row is baseline-aligned and comes to 26px tall. */}
        <div className="flex h-[26px] items-center justify-between gap-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
        <Skeleton className="mt-2 h-5 w-40" />
      </div>
    </div>
  );
}

export function CauseGrid({
  causes,
  loading,
  skeletonCount = 3,
  emptyState,
}: {
  causes: CauseDetail[];
  loading?: boolean;
  skeletonCount?: number;
  emptyState?: React.ReactNode;
}) {
  const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

  if (loading) {
    return (
      <div role="status" aria-label="Se încarcă cauzele" className={grid}>
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonCauseCard key={index} />
        ))}
      </div>
    );
  }

  if (causes.length === 0) return <>{emptyState}</>;

  return (
    <div className={grid}>
      {causes.map((cause, index) => (
        <CauseCard
          key={cause.id}
          cause={cause}
          className="animate-reveal"
          style={revealDelay(index)}
        />
      ))}
    </div>
  );
}
