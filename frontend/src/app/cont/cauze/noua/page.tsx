import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui";
import { PageTransition } from "@/components/layout/PageTransition";
import { CauseWizard } from "./_components/CauseWizard";

export const metadata: Metadata = {
  title: "Propune o cauză",
  description:
    "Deschide o cauză pe bid4: prezinți situația, încarci documentele care o susțin, iar noi o verificăm înainte de publicare.",
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
