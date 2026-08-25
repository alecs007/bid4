import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { RegisterForm } from "./_components/RegisterForm";
import { RegisterFormSkeleton } from "./_components/RegisterFormSkeleton";

export const metadata: Metadata = {
  title: "Cont nou",
  description:
    "Creează-ți contul bid4: licitezi, vinzi și trimiți o parte din fiecare vânzare către o cauză verificată.",
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
