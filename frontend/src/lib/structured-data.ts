import { AUCTION_CATEGORIES, SITE_URL } from "@/lib/config";
import { clampDescription } from "@/lib/seo";

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;

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

const CONDITION: Record<string, string> = {
  NEW: "https://schema.org/NewCondition",
  LIKE_NEW: "https://schema.org/UsedCondition",
  VERY_GOOD: "https://schema.org/UsedCondition",
  GOOD: "https://schema.org/UsedCondition",
};

const AVAILABILITY: Record<string, string> = {
  LIVE: "https://schema.org/InStock",
  RESERVED: "https://schema.org/BackOrder",
  SOLD: "https://schema.org/SoldOut",
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
  status?: string;
  seller?: { displayName?: string; username?: string; accountType?: string };
}

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
