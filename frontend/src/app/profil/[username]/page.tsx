import type { Metadata } from "next";

import { PageTransition } from "@/components/layout/PageTransition";
import { ProfileView } from "./_components/ProfileView";

export const metadata: Metadata = {
  title: "Profil",
  description:
    "Anunțurile, cauzele și impactul unui membru bid4 — persoană sau organizație.",
};

export default async function ProfilePage({
  params,
}: PageProps<"/profil/[username]">) {
  const { username } = await params;

  return (
    <PageTransition>
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <ProfileView username={username} />
      </main>
    </PageTransition>
  );
}
