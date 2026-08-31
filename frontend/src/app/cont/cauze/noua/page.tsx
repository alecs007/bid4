import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui";
import { PageTransition } from "@/components/layout/PageTransition";
import { CauseWizard } from "./_components/CauseWizard";

export const metadata: Metadata = {
  title: "Propune o cauză",
  description:
    "Ne spui despre ce este vorba și încarci documentele care o susțin. O verificăm înainte să apară pe site.",
  robots: { index: false, follow: false },
};

export default function NewCausePage() {
  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Contul meu", href: "/cont" },
            { label: "Cauzele mele", href: "/cont/cauze" },
            { label: "Cauză nouă" },
          ]}
          className="mb-4"
        />
        <CauseWizard />
      </main>
    </PageTransition>
  );
}
