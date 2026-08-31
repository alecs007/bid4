import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/config";

/**
 * What a crawler may read.
 *
 * <p>The catalogue is the point of the site and is open. Everything behind an
 * account is disallowed — not as a security control, since the API refuses those
 * requests anyway, but because a crawler that follows them spends its budget on
 * pages it will only ever be redirected away from, and any that did get indexed
 * would be a sign-in screen wearing someone's page title.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/cont/", "/operator/", "/admin/", "/design-system", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
