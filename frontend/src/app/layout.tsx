import type { Metadata, Viewport } from "next";
import { Nunito, Baloo_2 } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { SESSION_HINT_SCRIPT } from "@/lib/auth/session-hint";
import { SwrProvider } from "@/lib/hooks/SwrProvider";
import { SITE_URL } from "@/lib/config";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationSchema, websiteSchema } from "@/lib/structured-data";
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "bid4 | Cumperi sau vinzi, faci un bine",
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
  icons: {
    icon: [
      { url: "/icon/favicon-96x96.png", type: "image/png", sizes: "96x96" },
      { url: "/icon/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon/favicon.ico",
    apple: [{ url: "/icon/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: { title: "Bid4" },
  openGraph: {
    type: "website",
    locale: "ro_RO",
    siteName: "bid4",
    url: "/",
    title: "bid4 | Cumperi sau vinzi, faci un bine",
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
    title: "bid4 | Cumperi sau vinzi, faci un bine",
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
      suppressHydrationWarning
      className={`${nunito.variable} ${baloo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-canvas text-ink-900">
        <script dangerouslySetInnerHTML={{ __html: SESSION_HINT_SCRIPT }} />
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
            </ToastProvider>
          </AuthProvider>
        </SwrProvider>
      </body>
    </html>
  );
}
