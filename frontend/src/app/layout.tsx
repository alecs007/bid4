import type { Metadata, Viewport } from "next";
import { Nunito, Baloo_2 } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SwrProvider } from "@/lib/hooks/SwrProvider";
import { SITE_URL } from "@/lib/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";
// import { DevRoleSwitcher } from "@/components/auth/DevRoleSwitcher";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { RouteProgress } from "@/components/layout/RouteProgress";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

/**
 * What every page inherits.
 *
 * <p>`metadataBase` is what turns a relative image or canonical into the
 * absolute URL a crawler needs; without it Next drops them and the social card
 * silently resolves to nothing.
 *
 * <p>Titles read "page | bid4". The pipe rather than a middle dot because it is
 * what search results and browser tabs are read in, and a dot at small sizes is
 * easy to lose against a diacritic.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "bid4 | Investește în bine prin licitații",
    template: "%s | bid4",
  },
  description:
    "Lucrurile nefolosite pot face mai mult decât să ocupe spațiu. Licitezi pentru ce îți place, iar o parte din preț merge la o cauză verificată.",
  keywords: [
    "licitatii online",
    "licitatii caritabile",
    "cauze verificate",
    "donatii",
    "vinde online",
  ],
  applicationName: "bid4",
  authors: [{ name: "bid4" }],
  creator: "bid4",
  publisher: "bid4",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    siteName: "bid4",
    url: "/",
    title: "bid4 | Investește în bine prin licitații",
    description:
      "Lucrurile nefolosite pot face mai mult decât să ocupe spațiu. Licitezi pentru ce îți place, iar o parte din preț merge la o cauză verificată.",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "bid4 — licitații care susțin cauze verificate",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "bid4 | Investește în bine prin licitații",
    description:
      "Lucrurile nefolosite pot face mai mult decât să ocupe spațiu. Licitezi pentru ce îți place, iar o parte din preț merge la o cauză verificată.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      // A listing's own picture is the useful preview; let it be shown in full.
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: "#58cc02",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ro"
      className={`${nunito.variable} ${baloo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink-900">
        {/* Who runs the site and how to search it. Everything else that
            describes a page refers back to these by id rather than repeating
            them. */}
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
        <SwrProvider>
          <AuthProvider>
            <ToastProvider>
              <a
                href="#continut"
                className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-white focus:px-4 focus:py-2 focus:font-bold"
              >
                Sari la conținut
              </a>
              <SmoothScroll />
              <RouteProgress />
              <SiteHeader />
              <div id="continut" className="flex-1">
                {children}
              </div>
              <SiteFooter />
              {/* <DevRoleSwitcher /> */}
            </ToastProvider>
          </AuthProvider>
        </SwrProvider>
      </body>
    </html>
  );
}
