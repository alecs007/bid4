import { PAGINATION, USE_MOCK, type ProductCategoryId } from "@/lib/config";
import { delay, getWorld, maybeFailRead, notFound } from "@/lib/mock/store";
import { publicUserById } from "@/lib/mock/join";
import type { Auction, ID, Page, Product, PublicUser } from "@/lib/types";

import { http } from "./http";

/**
 * The product catalogue: the same items as `/licitatii`, but browsed as
 * objects rather than as running auctions. A product always belongs to exactly
 * one auction in this model.
 */

export interface ProductWithContext extends Product {
  seller: PublicUser;
  auction?: Auction;
  causeName: string;
  causeSlug: string;
}

export interface ProductFilters {
  q?: string;
  category?: ProductCategoryId[];
  page?: number;
  pageSize?: number;
}

function withContext(product: Product): ProductWithContext {
  const world = getWorld();
  const auction = world.auctions.find((item) => item.productId === product.id);
  const cause = world.causes.find((item) => item.id === product.causeId);

  return {
    ...product,
    seller: publicUserById(product.sellerId),
    auction,
    causeName: cause?.name ?? "Cauză bid4",
    causeSlug: cause?.slug ?? "",
  };
}

/** GET /products */
export async function listProducts(
  filters: ProductFilters = {},
): Promise<Page<ProductWithContext>> {
  if (!USE_MOCK) {
    return http<Page<ProductWithContext>>("/products", {
      query: {
        q: filters.q,
        category: filters.category,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    });
  }

  await delay();
  maybeFailRead("produsele");
  const world = getWorld();

  // Drafts and withdrawn listings never surface in the public catalogue.
  const hiddenStatuses = new Set(["DRAFT", "PENDING_REVIEW", "CANCELLED"]);

  const items = world.products
    .map(withContext)
    .filter((product) =>
      product.auction ? !hiddenStatuses.has(product.auction.status) : false,
    )
    .filter((product) =>
      filters.category?.length
        ? filters.category.includes(product.category)
        : true,
    )
    .filter((product) =>
      filters.q
        ? `${product.title} ${product.description}`
            .toLowerCase()
            .includes(filters.q.trim().toLowerCase())
        : true,
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const page = filters.page ?? 1;
  const pageSize = Math.min(
    filters.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE,
    PAGINATION.MAX_PAGE_SIZE,
  );
  const start = (page - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    total: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

/** GET /products/{id} */
export async function getProduct(id: ID): Promise<ProductWithContext> {
  if (!USE_MOCK) return http<ProductWithContext>(`/products/${id}`);

  await delay();
  maybeFailRead("produsul");
  const world = getWorld();
  const product = world.products.find((item) => item.id === id);
  if (!product) notFound("Produsul");
  return withContext(product);
}
