import Image from "next/image";
import Link from "next/link";

import { Icons } from "@/components/icons";
import { SkeletonGrid } from "@/components/ui";
import type { ProductWithContext } from "@/lib/api/products";
import { PRODUCT_CATEGORIES } from "@/lib/config";
import { AUCTION_STATUS, PRODUCT_CONDITION } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { revealDelay } from "@/lib/utils/reveal";
import { cn } from "@/lib/utils/cn";

/** Same frame as `<AuctionCard>`, so the two grids sit together and share `<SkeletonGrid>`. */
export function ProductCard({
  product,
  className,
  style,
}: {
  product: ProductWithContext;
  className?: string;
  style?: React.CSSProperties;
}) {
  const category = PRODUCT_CATEGORIES.find(
    (item) => item.id === product.category,
  );
  const cover = product.images[0] ?? "";
  const auction = product.auction;
  const live = auction?.status === "LIVE";

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-3xl bg-white ring-1 ring-edge p-2 transition-transform duration-200 hover:-translate-y-0.5",
        className,
      )}
      style={style}
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-ink-100">
        <Image
          src={cover}
          alt=""
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1 text-xs font-bold text-ink-800 backdrop-blur-sm">
          {PRODUCT_CONDITION[product.condition]}
        </span>
        <span className="absolute inset-x-2 bottom-2 flex items-center gap-1.5 rounded-lg bg-white/95 py-1 pr-2 pl-2 backdrop-blur-sm">
          <Icons.donation
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 text-primary-700"
          />
          <span className="min-w-0 truncate text-xs font-bold text-ink-700">
            {product.causeName}
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col px-2 pt-2 pb-1.5">
        <Link
          href={`/produse/${product.id}`}
          className="font-display text-[15px] leading-[1.3] font-bold text-ink-900 after:absolute after:inset-0 sm:text-base"
        >
          <span className="line-clamp-2 min-h-[2.6em]">{product.title}</span>
        </Link>
        <div className="mt-auto flex items-end justify-between gap-1.5 pt-2.5">
          {auction ? (
            <span className="numeric shrink-0 font-display text-xl leading-none font-extrabold tracking-tight whitespace-nowrap text-ink-900 sm:text-2xl">
              {formatMoney(auction.currentPrice, { compact: true })}
            </span>
          ) : (
            <span className="text-sm font-bold text-ink-500">Fără licitație</span>
          )}
          {auction ? (
            <span
              className={cn(
                "min-w-0 truncate rounded-md px-1.5 py-0.5 text-xs font-bold",
                live
                  ? "bg-primary-50 text-primary-800"
                  : auction.status === "SOLD"
                    ? "bg-success-50 text-success-700"
                    : "bg-ink-100 text-ink-600",
              )}
            >
              {AUCTION_STATUS[auction.status].label}
            </span>
          ) : (
            <span className="min-w-0 truncate text-xs font-bold text-ink-500">
              {category?.label}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  products,
  loading,
  skeletonCount = 12,
  emptyState,
}: {
  products: ProductWithContext[];
  loading?: boolean;
  skeletonCount?: number;
  emptyState?: React.ReactNode;
}) {
  if (loading) return <SkeletonGrid count={skeletonCount} columns={4} />;
  if (products.length === 0) return <>{emptyState}</>;

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          className="animate-reveal"
          style={revealDelay(index)}
        />
      ))}
    </div>
  );
}
