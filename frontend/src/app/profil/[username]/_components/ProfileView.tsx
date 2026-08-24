"use client";

import { useState } from "react";

import { AuctionGrid } from "@/components/auctions/AuctionCard";
import { CauseGrid } from "@/components/causes/CauseCard";
import { Icons } from "@/components/icons";
import {
  Avatar,
  Badge,
  Breadcrumbs,
  ButtonLink,
  EmptyState,
  ErrorState,
  SegmentedControl,
  SkeletonProfile,
  Stat,
} from "@/components/ui";
import { listAuctions } from "@/lib/api/auctions";
import { listCauses } from "@/lib/api/causes";
import { getPublicProfile } from "@/lib/api/users";
import { formatMoney } from "@/lib/money";
import { useApi } from "@/lib/hooks/useApi";
import { formatMemberSince } from "@/lib/utils/date";

type Tab = "listings" | "causes";

/**
 * One page for every kind of account. An individual and an organisation are
 * the same role with the same powers, so they get the same profile — the only
 * difference is the legal name an organisation carries under its own.
 */
export function ProfileView({ username }: { username: string }) {
  const [tab, setTab] = useState<Tab>("listings");

  const {
    data: profile,
    loading,
    error,
  } = useApi(() => getPublicProfile(username), `profile:${username}`);

  const sellerId = profile?.user.id;

  const { data: auctions, loading: auctionsLoading } = useApi(
    () => listAuctions({ sellerId, pageSize: 12 }),
    `profile-auctions:${sellerId ?? ""}`,
    { enabled: Boolean(sellerId) },
  );

  const { data: causes, loading: causesLoading } = useApi(
    () => listCauses({ organizerId: sellerId }),
    `profile-causes:${sellerId ?? ""}`,
    { enabled: Boolean(sellerId) },
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

  return (
    <div className="animate-reveal flex flex-col gap-6 sm:gap-8">
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
            <Badge tone={isOrganization ? "sky" : "neutral"} variant="soft">
              {isOrganization ? "Organizație" : "Persoană"}
            </Badge>
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

      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Stat
          icon={<Icons.donation aria-hidden="true" className="h-5 w-5" />}
          tone="primary"
          label="Strâns pentru cauze"
          value={formatMoney(user.totalRaised, { compact: true })}
        />
        <Stat
          icon={<Icons.auction aria-hidden="true" className="h-5 w-5" />}
          tone="sky"
          label="Licitații active"
          value={String(profile.activeAuctionCount)}
        />
        <Stat
          icon={<Icons.success aria-hidden="true" className="h-5 w-5" />}
          tone="success"
          label="Vânzări încheiate"
          value={String(profile.completedSaleCount)}
        />
      </div>

      <section>
        <SegmentedControl
          ariaLabel="Ce arată profilul"
          value={tab}
          onChange={setTab}
          className="mb-4"
          options={[
            { value: "listings" as Tab, label: "Anunțuri" },
            {
              value: "causes" as Tab,
              label: `Cauze${profile.causeCount ? ` (${profile.causeCount})` : ""}`,
            },
          ]}
        />

        {tab === "listings" ? (
          <AuctionGrid
            auctions={auctions?.items ?? []}
            loading={auctionsLoading}
            skeletonCount={4}
            emptyState={
              <EmptyState
                title="Niciun anunț public"
                description={`${user.displayName} nu are licitații publicate acum.`}
                compact
              />
            }
          />
        ) : (
          <CauseGrid
            causes={causes ?? []}
            loading={causesLoading}
            skeletonCount={3}
            emptyState={
              <EmptyState
                title="Nicio cauză deschisă"
                description={`${user.displayName} nu strânge fonduri pentru o cauză acum.`}
                compact
              />
            }
          />
        )}
      </section>
    </div>
  );
}
