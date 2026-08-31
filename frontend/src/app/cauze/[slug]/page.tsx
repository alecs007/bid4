import type { Metadata } from "next";

import { clampDescription, fetchForMetadata, type CauseSeo } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, causeSchema } from "@/lib/structured-data";

import { CauseDetailView } from "./_components/CauseDetailView";
import { PageTransition } from "@/components/layout/PageTransition";

export async function generateMetadata({
  params,
}: PageProps<"/cauze/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const cause = await fetchForMetadata<CauseSeo>(`/causes/${slug}`);

  if (!cause) {
    return {
      title: "Cauză",
      description:
        "Povestea cauzei, documentele verificate, progresul către obiectiv și licitațiile care o susțin.",
      alternates: { canonical: `/cauze/${slug}` },
    };
  }

  const description = clampDescription(
    cause.shortDescription ??
      `Susține ${cause.name} licitând pe bid4. Cauză verificată cu documente confirmate și progres public către obiectiv.`,
  );

  return {
    title: cause.name,
    description,
    alternates: { canonical: `/cauze/${slug}` },
    openGraph: {
      type: "article",
      url: `/cauze/${slug}`,
      title: `${cause.name} | bid4`,
      description,
      images: cause.imageUrl ? [{ url: cause.imageUrl, alt: cause.name }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${cause.name} | bid4`,
      description,
      images: cause.imageUrl ? [cause.imageUrl] : undefined,
    },
  };
}

export default async function CausePage({ params }: PageProps<"/cauze/[slug]">) {
  const { slug } = await params;
  const cause = await fetchForMetadata<CauseSeo>(`/causes/${slug}`);

  return (
    <PageTransition>
      {cause ? (
        <>
          <JsonLd data={causeSchema({ ...cause, slug })} />
          <JsonLd
            data={breadcrumbSchema([
              { name: "Acasă", path: "/" },
              { name: "Cauze", path: "/cauze" },
              { name: cause.name, path: `/cauze/${slug}` },
            ])}
          />
        </>
      ) : null}
      <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        <CauseDetailView slug={slug} />
      </main>
    </PageTransition>
  );
}
