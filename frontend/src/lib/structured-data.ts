import { AUCTION_CATEGORIES, SITE_URL } from "@/lib/config";
import { clampDescription } from "@/lib/seo";

/**
 * The schema.org descriptions of what a page is about.
 *
 * <p>Built here rather than inline so the shapes stay in one place and stay
 * honest: every field is one the API actually returns, because a schema that
 * claims a rating or a stock count the product does not have is the kind of
 * thing that gets structured data ignored altogether.
 */

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

/** Who runs the site. Referenced by id from everything else, never repeated. */
export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: "bid4",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/images/logo.webp`,
    description:
      "Licitații online unde o parte din fiecare preț final merge la o cauză verificată.",
  };
}

/**
 * The site itself, and how to search it.
 *
 * <p>The search action is the catalogue's own `?q=`, so a result can offer a
 * search box that lands where the site's own search lands.
 */
export function websiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: "bid4",
    inLanguage: "ro-RO",
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/licitatii?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** schema.org has its own vocabulary for wear; ours has to map onto it. */
const CONDITION: Record<string, string> = {
  NEW: "https://schema.org/NewCondition",
  LIKE_NEW: "https://schema.org/UsedCondition",
  VERY_GOOD: "https://schema.org/UsedCondition",
  GOOD: "https://schema.org/UsedCondition",
};

/** Only a live listing can still be bid on. */
const AVAILABILITY: Record<string, string> = {
  LIVE: "https://schema.org/InStock",
  SCHEDULED: "https://schema.org/PreOrder",
  SOLD: "https://schema.org/SoldOut",
  UNSOLD: "https://schema.org/SoldOut",
  CANCELLED: "https://schema.org/Discontinued",
};

export interface AuctionSchemaInput {
  id: string;
  title: string;
  description?: string;
  images?: string[];
  category?: string;
  condition?: string;
  currentPrice?: number;
  endTime?: string;
  status?: string;
  seller?: { displayName?: string; username?: string; accountType?: string };
}

/**
 * A listing, as a product with one offer on it.
 *
 * <p>Price is in lei because schema.org money is a decimal amount, while the
 * API and everything above it count whole bani. `priceValidUntil` is the close:
 * an offer on an auction is exactly as good as the time left on it.
 */
export function auctionSchema(auction: AuctionSchemaInput): Record<string, unknown> {
  const url = `${SITE_URL}/licitatii/${auction.id}`;
  const category = AUCTION_CATEGORIES.find((item) => item.id === auction.category);
  const seller = auction.seller;

  const absolute = (image: string) =>
    image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: auction.title,
    description: auction.description
      ? clampDescription(auction.description, 300)
      : undefined,
    image: auction.images?.length ? auction.images.map(absolute) : undefined,
    category: category?.label,
    itemCondition: auction.condition ? CONDITION[auction.condition] : undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "RON",
      price:
        typeof auction.currentPrice === "number"
          ? (auction.currentPrice / 100).toFixed(2)
          : undefined,
      priceValidUntil: auction.endTime,
      availability: auction.status ? AVAILABILITY[auction.status] : undefined,
      seller: seller?.displayName
        ? {
            "@type":
              seller.accountType === "ORGANIZATION" ? "Organization" : "Person",
            name: seller.displayName,
            url: seller.username ? `${SITE_URL}/profil/${seller.username}` : undefined,
          }
        : { "@id": ORGANIZATION_ID },
    },
  };
}

/**
 * A cause, as the thing being funded.
 *
 * <p>Not a Product: nobody buys a cause. `NGO` is what schema.org has for an
 * organisation raising money, and where the record is a person's appeal rather
 * than a registered body the fundraiser is still described by its own page.
 */
export function causeSchema(cause: {
  slug: string;
  name: string;
  shortDescription?: string;
  imageUrl?: string;
  city?: string;
}): Record<string, unknown> {
  const url = `${SITE_URL}/cauze/${cause.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "NGO",
    "@id": `${url}#cause`,
    name: cause.name,
    url,
    description: cause.shortDescription
      ? clampDescription(cause.shortDescription, 300)
      : undefined,
    image: cause.imageUrl,
    address: cause.city
      ? { "@type": "PostalAddress", addressLocality: cause.city, addressCountry: "RO" }
      : undefined,
    parentOrganization: { "@id": ORGANIZATION_ID },
  };
}

/** The trail a result can print under its own link. */
export function breadcrumbSchema(
  trail: { name: string; path: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((step, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: step.name,
      item: `${SITE_URL}${step.path}`,
    })),
  };
}
