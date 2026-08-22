import type { Metadata, Viewport } from "next";
import { Nunito, Baloo_2 } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { DevRoleSwitcher } from "@/components/auth/DevRoleSwitcher";
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
  title: {
    default: "bid4 · Licitezi. Câștigi. Ajuți.",
    template: "%s · bid4",
  },
  description:
    "Platforma de licitații care transformă fiecare ofertă în ajutor real. Licitezi pentru lucruri care îți plac, iar o parte din preț merge direct către o cauză verificată.",
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
      </body>
    </html>
  );
}
