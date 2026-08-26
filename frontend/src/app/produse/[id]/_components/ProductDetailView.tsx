"use client";

import Link from "next/link";

import { Icons } from "@/components/icons";
import {
  Avatar,
  Breadcrumbs,
  ButtonLink,
  ErrorState,
  Gallery,
  SkeletonProductDetail,
} from "@/components/ui";
import { getProduct } from "@/lib/api/products";
import { PRODUCT_CATEGORIES } from "@/lib/config";
import { AUCTION_STATUS, PRODUCT_CONDITION } from "@/lib/labels";
import { formatMoney } from "@/lib/money";
import { useApi } from "@/lib/hooks/useApi";
import { formatDateRo } from "@/lib/utils/date";

const DETAIL_GRID =
  "grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-6";

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl bg-white ring-1 ring-edge p-5">
      <h2 className="mb-3 font-display text-lg font-extrabold text-ink-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function ProductDetailView({ productId }: { productId: string }) {
  const { data: product, loading, error } = useApi(
    () => getProduct(productId),
    `product:${productId}`,
  );

  if (loading && !product) return <SkeletonProductDetail />;

  if (error || !product) {
    return (
      <ErrorState
        title="Nu am găsit produsul"
        action={<ButtonLink href="/produse">Vezi catalogul</ButtonLink>}
      />
    );
  }

  const category = PRODUCT_CATEGORIES.find(
    (item) => item.id === product.category,
  );
  const auction = product.auction;
  const live = auction?.status === "LIVE";

  return (
    <div className="animate-reveal flex flex-col gap-4">
      <Breadcrumbs
        items={[
          { label: "Acasă", href: "/" },
          { label: "Produse", href: "/produse" },
          { label: product.title },
        ]}
      />

      <div className={DETAIL_GRID}>
        <div className="min-w-0">
          <Gallery images={product.images} alt={product.title} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-ink-100 px-2 py-1 text-sm font-bold text-ink-700">
                {PRODUCT_CONDITION[product.condition]}
              </span>
              {category ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-ink-100 px-2 py-1 text-sm font-bold text-ink-700">
                  <span aria-hidden="true">{category.emoji}</span>
                  {category.label}
                </span>
              ) : null}
            </div>
            <h1 className="font-display text-2xl leading-tight font-extrabold text-ink-900 sm:text-3xl">
              {product.title}
            </h1>
          </div>

          <div className="rounded-3xl bg-white ring-1 ring-edge p-5">
            {auction ? (
              <>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm text-ink-500">
                      {live
                        ? auction.bidCount > 0
                          ? "Ofertă curentă"
                          : "Preț de pornire"
                        : "Preț final"}
                    </p>
                    <p className="numeric font-display text-3xl leading-none font-extrabold text-ink-900">
                      {formatMoney(auction.currentPrice, { compact: true })}
                    </p>
                  </div>
                  <span className="rounded-lg bg-ink-100 px-2 py-1 text-sm font-bold text-ink-700">
                    {AUCTION_STATUS[auction.status].label}
                  </span>
                </div>
                <ButtonLink
                  href={`/licitatii/${auction.id}`}
                  size="lg"
                  fullWidth
                  variant={live ? "primary" : "secondary"}
                  className="mt-5"
                >
                  {live ? "Licitează pentru el" : "Vezi licitația"}
                </ButtonLink>
              </>
            ) : (
              <p className="text-ink-600">
                Produsul nu are o licitație activă acum.
              </p>
            )}
          </div>

          <Link
            href={`/cauze/${product.causeSlug}`}
            className="group flex items-center gap-3 rounded-3xl bg-white ring-1 ring-edge p-5 transition-transform hover:-translate-y-0.5"
          >
            <Icons.donation
              aria-hidden="true"
              className="h-5 w-5 shrink-0 text-primary-700"
            />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-ink-500">Susține</span>
              <span className="block truncate font-display font-extrabold text-ink-900 group-hover:text-primary-700">
                {product.causeName}
              </span>
            </span>
            <Icons.forward
              aria-hidden="true"
              className="h-4 w-4 shrink-0 text-ink-400"
            />
          </Link>

          <Link
            href={`/profil/${product.seller.username}`}
            className="group rounded-3xl bg-white ring-1 ring-edge p-5 transition-transform hover:-translate-y-0.5"
          >
            <p className="mb-3 text-sm font-bold text-ink-500">Vândut de</p>
            <div className="flex items-center gap-3">
              <Avatar
                name={product.seller.displayName}
                src={product.seller.avatarUrl}
                accountType={product.seller.accountType}
                size="md"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold text-ink-900 group-hover:text-primary-700">
                  {product.seller.displayName}
                </p>
                <p className="text-sm text-ink-500">
                  <span className="numeric">
                    {product.seller.rating.toFixed(1).replace(".", ",")}
                  </span>{" "}
                  din {product.seller.ratingCount} evaluări
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

      <div className={DETAIL_GRID}>
        <div className="min-w-0">
          <Block title="Descriere">
            <p className="leading-relaxed whitespace-pre-line text-ink-700">
              {product.description}
            </p>
          </Block>
        </div>

        <div className="min-w-0">
          <Block title="Detalii">
            <dl className="flex flex-col gap-2.5 text-[15px]">
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-ink-500">Stare</dt>
                <dd className="min-w-0 truncate text-right font-bold text-ink-900">
                  {PRODUCT_CONDITION[product.condition]}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-ink-500">Categorie</dt>
                <dd className="min-w-0 truncate text-right font-bold text-ink-900">
                  {category?.label}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-ink-500">Greutate</dt>
                <dd className="numeric font-bold text-ink-900">
                  {product.weightGrams} g
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="shrink-0 text-ink-500">Listat</dt>
                <dd className="font-bold text-ink-900">
                  {formatDateRo(product.createdAt)}
                </dd>
              </div>
            </dl>
          </Block>
        </div>
      </div>
    </div>
  );
}
