"use client";

import { useState } from "react";

import { AuctionGrid } from "@/components/auctions/AuctionCard";
import { CauseGrid } from "@/components/causes/CauseCard";
import { Icons } from "@/components/icons";
import {
  Avatar,
  Breadcrumbs,
  ButtonLink,
  ErrorState,
  LoadMore,
  SegmentedControl,
  SkeletonGrid,
  SkeletonProfile,
  StatTile,
  StatTiles,
  VerifiedTag,
} from "@/components/ui";
import { listAuctions } from "@/lib/api/auctions";
import { listCauses } from "@/lib/api/causes";
import { getPublicProfile } from "@/lib/api/users";
import { PAGINATION } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { useApi, useApiPages, useWindowedList } from "@/lib/hooks/useApi";
import { formatMemberSince } from "@/lib/utils/date";

type Tab = "listings" | "causes";

/** An individual and an organisation have the same powers, so the same profile. */
export function ProfileView({ username }: { username: string }) {
  const [tab, setTab] = useState<Tab>("listings");

  const {
    data: profile,
    loading,
    error,
  } = useApi(() => getPublicProfile(username), `profile:${username}`);

  const sellerId = profile?.user.id;

  // Paged, like the catalogue and the search page: a seller with two hundred
  // listings should cost the same first screen as a seller with four.
  const auctions = useApiPages(
    (page) =>
      listAuctions({
        sellerId,
        page,
        pageSize: PAGINATION.DEFAULT_PAGE_SIZE,
      }),
    `profile-auctions:${sellerId ?? ""}`,
    { enabled: Boolean(sellerId) },
  );

  const { data: causes, loading: causesLoading } = useApi(
    () => listCauses({ organizerId: sellerId }),
    `profile-causes:${sellerId ?? ""}`,
    { enabled: Boolean(sellerId) },
  );

  // /causes has no page to ask for, so this one is windowed over what arrived.
  const shownCauses = useWindowedList(
    causes,
    sellerId ?? "",
    PAGINATION.DEFAULT_PAGE_SIZE,
  );

  if (loading && !profile) return <SkeletonProfile />;

  if (error || !profile) {
    return (
      <ErrorState
        title="Nu am găsit profilul"
        action={<ButtonLink href="/licitatii">Vezi licitațiile</ButtonLink>}
      />
    );
  }

  const { user } = profile;
  const isOrganization = user.accountType === "ORGANIZATION";

  // What this account actually has, once both answers are in. A tab row is a
  // question — "which of these two?" — and there is no question to ask when
  // only one of them exists, or neither. Both lists are asked for up front, so
  // the row appears at most once and never flickers between them.
  const listingsLoading = auctions.loading;
  const hasListings = auctions.items.length > 0;
  const hasCauses = (causes?.length ?? 0) > 0;
  const bothKinds = hasListings && hasCauses;
  const settled = !listingsLoading && !causesLoading;
  // With only one kind there is nothing to switch to, so the panel shown is
  // whichever one exists rather than whichever the tab last said. Until both
  // answers are in, the tab's own choice stands — deciding early puts the cause
  // panel up while the listings are still arriving.
  const showing: Tab = !settled
    ? tab
    : bothKinds
      ? tab
      : hasListings
        ? "listings"
        : "causes";

  return (
    // A floor under the page, the same one the search results stand on, so a
    // profile with two listings does not pull the footer halfway up the screen.
    <div className="animate-reveal flex min-h-[70vh] flex-col gap-6 sm:gap-8">
      <Breadcrumbs
        items={[{ label: "Acasă", href: "/" }, { label: user.displayName }]}
      />

      <header className="flex flex-col gap-5 rounded-3xl bg-white ring-1 ring-edge p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <Avatar
          name={user.displayName}
          src={user.avatarUrl}
          accountType={user.accountType}
          size="xl"
          className="shrink-0"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              {user.displayName}
            </h1>
            <VerifiedTag user={user} />
          </div>

          {/* Only when it says something the display name does not. */}
          {isOrganization &&
          user.orgLegalName &&
          user.orgLegalName !== user.displayName ? (
            <p className="mt-1 text-ink-600">{user.orgLegalName}</p>
          ) : null}

          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <Icons.rating aria-hidden="true" className="h-4 w-4 text-sun-500" />
              <span className="numeric font-bold text-ink-800">
                {user.rating.toFixed(1).replace(".", ",")}
              </span>
              din {user.ratingCount} evaluări
            </span>
            {user.city ? <span>{user.city}</span> : null}
            <span>Membru din {formatMemberSince(user.createdAt)}</span>
          </p>

          {user.bio ? (
            <p className="mt-3 max-w-2xl text-ink-700">{user.bio}</p>
          ) : null}
        </div>
      </header>

      {/* The same three tiles the listing page puts under a seller's name, so
          the two places that summarise a person summarise them the same way —
          three across on a phone as well, rather than a stack of three cards. */}
      <StatTiles>
        <StatTile
          illustration="amount-donated"
          value={formatMoney(user.totalRaised, { compact: true })}
          label="strâns pentru cauze"
        />
        <StatTile
          illustration="active-auctions"
          value={String(profile.activeAuctionCount)}
          label="licitații active"
        />
        <StatTile
          illustration="completed-sales"
          value={String(profile.completedSaleCount)}
          label="vânzări încheiate"
        />
      </StatTiles>

      {/* Nothing at all for an account with neither: an empty state under an
          empty tab row is two pieces of furniture around an absence. */}
      {settled && !hasListings && !hasCauses ? null : (
        <section>
          {bothKinds ? (
            <SegmentedControl
              ariaLabel="Ce arată profilul"
              value={tab}
              onChange={setTab}
              className="mb-4"
              options={[
                {
                  value: "listings" as Tab,
                  label: `Anunțuri (${auctions.total ?? auctions.items.length})`,
                },
                {
                  value: "causes" as Tab,
                  label: `Cauze (${causes?.length ?? 0})`,
                },
              ]}
            />
          ) : null}

          {showing === "listings" ? (
            <>
              <AuctionGrid
                auctions={auctions.items}
                loading={listingsLoading}
                skeletonCount={PAGINATION.DEFAULT_PAGE_SIZE}
              />
              <LoadMore
                hasMore={auctions.hasMore}
                loading={auctions.loadingMore}
                onReach={auctions.loadMore}
                waiting={<SkeletonGrid count={4} />}
              />
            </>
          ) : (
            <>
              <CauseGrid
                causes={shownCauses.items ?? []}
                loading={causesLoading}
                skeletonCount={3}
              />
              <LoadMore
                hasMore={shownCauses.hasMore}
                onReach={shownCauses.loadMore}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
