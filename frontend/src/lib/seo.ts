import { API_BASE, USE_MOCK } from "@/lib/config";

const DESCRIPTION_LIMIT = 155;

export function clampDescription(text: string, limit = DESCRIPTION_LIMIT): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export async function fetchForMetadata<T>(path: string): Promise<T | null> {
  if (USE_MOCK) return null;

  try {
    const response = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

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
