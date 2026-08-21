import type { Metadata, Viewport } from "next";
import { Nunito, Baloo_2 } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { DevRoleSwitcher } from "@/components/auth/DevRoleSwitcher";

/**
 * Nunito carries body/UI text, Baloo 2 carries display headings.
 * `latin-ext` is REQUIRED — Romanian diacritics (ă î â ș ț) live in that subset.
 */
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
      <body className="flex min-h-full flex-col bg-cream text-ink-900">
        <AuthProvider>
          <ToastProvider>
            {children}
            <DevRoleSwitcher />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
