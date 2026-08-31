import { API_BASE, USE_MOCK } from "@/lib/config";

/**
 * Metadata for a page whose subject only exists in the database.
 *
 * <p>Every listing shipped the same title — "Licitație" — which is one title
 * across the whole catalogue. To a search engine that is a site with one page
 * repeated a few hundred times, and none of them name what is being sold.
 *
 * <p>The read happens here, on the server, against the public GET the catalogue
 * already exposes. It is deliberately its own small fetch rather than the app's
 * client: that one carries a token, retries and a cache keyed to a viewer, none
 * of which a crawler has or needs.
 */

/** Long enough to be a description, short enough that Google prints all of it. */
const DESCRIPTION_LIMIT = 155;

export function clampDescription(text: string, limit = DESCRIPTION_LIMIT): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  // Cut on a word, so the ellipsis does not land mid-syllable.
  const cut = clean.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * One public record, or null.
 *
 * <p>Null on anything at all: a page still has to render when the API is asleep,
 * and inherited metadata is a smaller failure than a 500 where the listing
 * should be. Mock mode returns null immediately — its world lives in the
 * browser's storage, which the server cannot read.
 */
export async function fetchForMetadata<T>(path: string): Promise<T | null> {
  if (USE_MOCK) return null;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      // A listing's price and its closing time change; a crawler re-reading an
      // hour-old title is fine, a build baking one in permanently is not.
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/** The shape of the fields metadata needs, and no more. */
export interface AuctionSeo {
  title: string;
  description: string;
  images?: string[];
  donationPercent?: number;
  cause?: { name?: string };
}

export interface CauseSeo {
  name: string;
  shortDescription?: string;
  imageUrl?: string;
  city?: string;
}

export interface ProfileSeo {
  user?: {
    displayName?: string;
    username?: string;
    bio?: string;
    city?: string;
    avatarUrl?: string;
  };
}
