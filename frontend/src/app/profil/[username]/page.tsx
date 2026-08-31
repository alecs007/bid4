import type { Metadata } from "next";

import { clampDescription, fetchForMetadata, type ProfileSeo } from "@/lib/seo";

import { PageTransition } from "@/components/layout/PageTransition";
import { ProfileView } from "./_components/ProfileView";

export async function generateMetadata({
  params,
}: PageProps<"/profil/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchForMetadata<ProfileSeo>(`/users/${username}`);
  const user = profile?.user;

  if (!user?.displayName) {
    return {
      title: "Profil",
      description:
        "Licitațiile, cauzele și cât a strâns până acum un membru bid4.",
      alternates: { canonical: `/profil/${username}` },
    };
  }

  const where = user.city ? ` din ${user.city}` : "";
  const description = clampDescription(
    user.bio ??
      `Anunțurile, cauzele și impactul lui ${user.displayName}${where} pe bid4.`,
  );

  return {
    title: user.displayName,
    description,
    alternates: { canonical: `/profil/${username}` },
    openGraph: {
      type: "profile",
      url: `/profil/${username}`,
      title: `${user.displayName} | bid4`,
      description,
      images: user.avatarUrl ? [{ url: user.avatarUrl, alt: user.displayName }] : undefined,
    },
  };
}

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
