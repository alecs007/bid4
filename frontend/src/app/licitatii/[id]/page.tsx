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

/**
 * The listing's own title, not the word "Licitație".
 *
 * <p>Falls back to the generic copy when the catalogue cannot be read — a page
 * that renders with inherited metadata is a smaller failure than one that does
 * not render at all.
 */
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
      // The thing being sold, which is the only preview worth showing.
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
  // The same read generateMetadata already made. Next dedupes a fetch with the
  // same URL and options inside one request, so this costs nothing twice.
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
