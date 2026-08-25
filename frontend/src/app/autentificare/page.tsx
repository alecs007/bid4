import type { Metadata } from "next";
import { Suspense } from "react";

import { PageTransition } from "@/components/layout/PageTransition";
import { LoginForm } from "./_components/LoginForm";
import { LoginFormSkeleton } from "./_components/LoginFormSkeleton";

export const metadata: Metadata = {
  title: "Autentificare",
  description:
    "Intră în contul tău bid4 ca să licitezi, să vinzi și să susții cauze verificate.",
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
