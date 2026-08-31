import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { RegisterForm } from "./_components/RegisterForm";
import { RegisterFormSkeleton } from "./_components/RegisterFormSkeleton";

export const metadata: Metadata = {
  title: "Cont nou",
  description:
    "Îți faci cont în câteva minute. Licitezi, vinzi ce nu mai folosești și alegi cât din preț merge mai departe la o cauză.",
  keywords: ["cont bid4", "inregistrare", "vinde online"],
  alternates: { canonical: "/inregistrare" },
  openGraph: {
    type: "website",
    url: "/inregistrare",
    title: "Cont nou | bid4",
    description:
      "Îți faci cont în câteva minute. Licitezi, vinzi și alegi cât din preț merge mai departe la o cauză.",
  },
};

export default function RegisterPage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <Suspense fallback={<RegisterFormSkeleton />}>
          <RegisterForm />
        </Suspense>
      </main>
    </PageTransition>
  );
}
