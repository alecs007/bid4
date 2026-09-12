import type { MetadataRoute } from "next";

import { AUCTION_CATEGORIES, SITE_URL } from "@/lib/config";

/**
 * The pages worth crawling, and how often they are worth coming back to.
 *
 * <p>Only routes that exist without an account and without an id. Individual
 * listings and causes are deliberately absent: they are fetched in the browser,
 * so this file cannot enumerate them without a server-side read, and a sitemap
 * that lists URLs it cannot describe is worse than one that lists fewer. Add
 * them here once the catalogue is read on the server.
 *
 * <p>The category filters are listed because each is a real landing page for a
 * real search — someone looking for a second-hand bicycle should arrive at the
 * bicycles, not at the front door.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE_URL}/licitatii`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/cauze`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/ajutor`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/autentificare`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/inregistrare`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];

  const categories: MetadataRoute.Sitemap = AUCTION_CATEGORIES.map((category) => ({
    url: `${SITE_URL}/licitatii?category=${category.id}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  return [...core, ...categories];
}
