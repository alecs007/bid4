import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { LoginForm } from "./_components/LoginForm";
import { LoginFormSkeleton } from "./_components/LoginFormSkeleton";

export const metadata: Metadata = {
  title: "Autentificare",
  description:
    "Intră în cont ca să licitezi, să îți urmărești ofertele și să vinzi în sprijinul unei cauze.",
  alternates: { canonical: "/autentificare" },
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </main>
    </PageTransition>
  );
}
