"use client";

import { AuctionCard } from "@/components/auctions/AuctionCard";
import { ButtonLink, CardRail, SkeletonAuctionCard } from "@/components/ui";
import { listRelatedAuctions } from "@/lib/api/auctions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import { revealDelay } from "@/lib/utils/reveal";

/**
 * The width the auctions grid gives a card at the same breakpoint — two across,
 * then four from `lg` — so a card is the same size wherever it is read. The
 * rail's content box is the width of that grid and carries the same gaps, so
 * the two arithmetics agree; a fixed width here did not, and left the rail's
 * cards visibly smaller than the home page's from `sm` up.
 */
const CARD =
  "w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]";

/** Left out entirely when nothing matches, rather than padded with whatever is live. */
export function RelatedAuctions({
  auctionId,
  causeName,
  causeSlug,
}: {
  auctionId: string;
  causeName: string;
  causeSlug: string;
}) {
  const { user } = useAuth();

  const { data, loading } = useApi(
    () => listRelatedAuctions(auctionId, user?.id),
    `related:${auctionId}:${user?.id ?? "anon"}`,
  );

  if (!loading && (!data || data.length === 0)) return null;

  return (
    <section aria-labelledby="related" className="mt-6 sm:mt-8">
      <CardRail
        ariaLabel="Licitații asemănătoare"
        heading={
          <h2
            id="related"
            className="min-w-0 font-display text-xl font-extrabold text-ink-900 sm:text-2xl"
          >
            Alte licitații
          </h2>
        }
        action={
          <ButtonLink
            href={`/cauze/${causeSlug}`}
            variant="link"
            size="sm"
            className="hidden min-w-0 truncate text-sm sm:inline-flex"
          >
            Tot pentru {causeName}
          </ButtonLink>
        }
      >
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className={CARD}>
                <SkeletonAuctionCard />
              </div>
            ))
          : data?.map((auction, index) => (
              <AuctionCard
                key={auction.id}
                auction={auction}
                className={`${CARD} animate-reveal`}
                style={revealDelay(index)}
              />
            ))}
      </CardRail>
    </section>
  );
}
