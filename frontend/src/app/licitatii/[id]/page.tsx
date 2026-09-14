import type { Metadata } from "next";

import { AuctionDetailView } from "./_components/AuctionDetailView";
import { PageTransition } from "@/components/layout/PageTransition";
import { clampDescription, fetchForMetadata, type AuctionSeo } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  auctionSchema,
  breadcrumbSchema,
  type AuctionSchemaInput,
} from "@/lib/structured-data";

export async function generateMetadata({
  params,
}: PageProps<"/licitatii/[id]">): Promise<Metadata> {
  const { id } = await params;
  const auction = await fetchForMetadata<AuctionSeo>(`/auctions/${id}`);

  if (!auction) {
    return {
      title: "Licitație",
      description:
        "Licitează pentru un obiect și trimite o parte din preț către o cauză verificată.",
      alternates: { canonical: `/licitatii/${id}` },
    };
  }

  const share = auction.donationPercent
    ? `${auction.donationPercent}% din preț merge la ${auction.cause?.name ?? "o cauză verificată"}. `
    : "";
  const description = clampDescription(`${share}${auction.description ?? ""}`);
  const image = auction.images?.[0];

  return {
    title: auction.title,
    description,
    alternates: { canonical: `/licitatii/${id}` },
    openGraph: {
      type: "website",
      url: `/licitatii/${id}`,
      title: `${auction.title} | bid4`,
      description,
      images: image ? [{ url: image, alt: auction.title }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${auction.title} | bid4`,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function AuctionPage({
  params,
}: PageProps<"/licitatii/[id]">) {
  const { id } = await params;
  const auction = await fetchForMetadata<AuctionSchemaInput>(`/auctions/${id}`);

  return (
    <PageTransition>
      {auction ? (
        <>
          <JsonLd data={auctionSchema({ ...auction, id })} />
          <JsonLd
            data={breadcrumbSchema([
              { name: "Acasă", path: "/" },
              { name: "Licitații", path: "/licitatii" },
              { name: auction.title, path: `/licitatii/${id}` },
            ])}
          />
        </>
      ) : null}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AuctionDetailView auctionId={id} />
      </main>
    </PageTransition>
  );
}
