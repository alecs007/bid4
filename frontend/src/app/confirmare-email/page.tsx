import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { ConfirmEmail } from "./_components/ConfirmEmail";
import { ConfirmEmailSkeleton } from "./_components/ConfirmEmailSkeleton";

export const metadata: Metadata = {
  title: "Confirmare email",
  description: "Confirmă adresa de email ca să îți poți folosi contul bid4.",
  robots: { index: false, follow: false },
};

export default function ConfirmEmailPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6 sm:py-16">
        <Suspense fallback={<ConfirmEmailSkeleton />}>
          <ConfirmEmail />
        </Suspense>
      </main>
    </PageTransition>
  );
}
