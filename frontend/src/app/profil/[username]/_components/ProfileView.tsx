"use client";

import { useState } from "react";

import { AuctionGrid } from "@/components/auctions/AuctionCard";
import { CauseGrid } from "@/components/causes/CauseCard";
import {
  Avatar,
  Breadcrumbs,
  ButtonLink,
  ErrorState,
  LoadMore,
  SectionLabel,
  SegmentedControl,
  SkeletonGrid,
  SkeletonProfile,
  StarRating,
  StatTile,
  StatTiles,
  AccountTypeTag,
} from "@/components/ui";
import { listAuctions } from "@/lib/api/auctions";
import { listCauses } from "@/lib/api/causes";
import { getPublicProfile } from "@/lib/api/users";
import { PAGINATION } from "@/lib/config";
import { formatMoney } from "@/lib/money";
import { useApi, useApiPages, useWindowedList } from "@/lib/hooks/useApi";
import { formatMemberSince } from "@/lib/utils/date";
import { countRo } from "@/lib/utils/plural";

type Tab = "listings" | "causes";

export function ProfileView({ username }: { username: string }) {
  const [tab, setTab] = useState<Tab>("listings");

  const {
    data: profile,
    loading,
    error,
  } = useApi(() => getPublicProfile(username), `profile:${username}`);

  const sellerId = profile?.user.id;

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

  const listingsLoading = auctions.loading;
  const hasListings = auctions.items.length > 0;
  const hasCauses = (causes?.length ?? 0) > 0;
  const bothKinds = hasListings && hasCauses;
  const settled = !listingsLoading && !causesLoading;
  const showing: Tab = !settled
    ? tab
    : bothKinds
      ? tab
      : hasListings
        ? "listings"
        : "causes";

  return (
    <div className="animate-reveal flex min-h-[70vh] flex-col gap-6 sm:gap-8">
      <Breadcrumbs
        items={[{ label: "Acasă", href: "/" }, { label: user.displayName }]}
      />

      <header className="flex flex-col gap-5 rounded-3xl bg-white p-5 ring-1 ring-edge sm:p-6 lg:flex-row lg:items-center lg:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
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
              <AccountTypeTag user={user} />
            </div>

            {isOrganization &&
            user.orgLegalName &&
            user.orgLegalName !== user.displayName ? (
              <p className="mt-1 text-ink-600">{user.orgLegalName}</p>
            ) : null}

            <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
              {user.ratingCount > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <StarRating value={user.rating} />
                  <span className="numeric font-bold text-ink-800">
                    {user.rating.toFixed(1).replace(".", ",")}
                  </span>
                  din {countRo(user.ratingCount, "evaluare", "evaluări")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <StarRating value={0} />
                  Nicio evaluare încă
                </span>
              )}
              {user.city ? <span>{user.city}</span> : null}
              <span>Membru din {formatMemberSince(user.createdAt)}</span>
            </p>

            {user.bio ? (
              <p className="mt-3 max-w-2xl text-ink-700">{user.bio}</p>
            ) : null}
          </div>
        </div>

        <StatTiles className="w-full shrink-0 lg:w-[22rem]">
          <StatTile
            illustration="amount-donated"
            value={formatMoney(user.totalRaised, { compact: true })}
            label="donații"
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
      </header>

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
          ) : (
            <SectionLabel className="mb-4">
              {showing === "listings"
                ? `Anunțuri (${auctions.total ?? auctions.items.length})`
                : `Cauze (${causes?.length ?? 0})`}
            </SectionLabel>
          )}

          {showing === "listings" ? (
            <>
              <AuctionGrid
                auctions={auctions.items}
                loading={listingsLoading}
                columns={5}
                skeletonCount={PAGINATION.DEFAULT_PAGE_SIZE}
              />
              <LoadMore
                hasMore={auctions.hasMore}
                loading={auctions.loadingMore}
                onReach={auctions.loadMore}
                waiting={<SkeletonGrid count={5} columns={5} />}
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
