"use client";

import { AuctionCard } from "@/components/auctions/AuctionCard";
import { ButtonLink, CardRail, SkeletonAuctionCard } from "@/components/ui";
import { listRelatedAuctions } from "@/lib/api/auctions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useApi } from "@/lib/hooks/useApi";
import { revealDelay } from "@/lib/utils/reveal";

/**
 * Two across on a phone, at exactly the width the auctions grid gives them —
 * the rail's own content width less the gap between the pair.
 */
const CARD = "w-[calc((100%-0.75rem)/2)] shrink-0 snap-start sm:w-52";

/**
 * "More like this" under an auction: same cause first, then the same kind of
 * object. The row is left out entirely when nothing matches, rather than
 * padding it with whatever else happens to be live.
 */
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
