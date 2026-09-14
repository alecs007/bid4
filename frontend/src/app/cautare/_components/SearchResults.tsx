"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuctionGrid } from "@/components/auctions/AuctionCard";
import { CauseGrid } from "@/components/causes/CauseCard";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  LoadMore,
  SegmentedControl,
  Skeleton,
  SkeletonGrid,
} from "@/components/ui";
import { listAuctions } from "@/lib/api/auctions";
import { listCauses } from "@/lib/api/causes";
import { searchUsers } from "@/lib/api/users";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PAGINATION } from "@/lib/config";
import { useApi, useApiPages, useWindowedList } from "@/lib/hooks/useApi";
import { OFFERABLE_AUCTION_STATUSES } from "@/lib/types";
import { countRo } from "@/lib/utils/plural";

const MAX_TERM_LENGTH = 120;

const STEP = PAGINATION.DEFAULT_PAGE_SIZE;

type Tab = "licitatii" | "cauze" | "membri";

const TABS: Tab[] = ["licitatii", "cauze", "membri"];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

export function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const term = (params.get("q") ?? "").slice(0, MAX_TERM_LENGTH).trim();

  const urlTab: Tab = isTab(params.get("tab"))
    ? (params.get("tab") as Tab)
    : "licitatii";
  const [tab, setTab] = useState<Tab>(urlTab);
  const [lastUrlTab, setLastUrlTab] = useState<Tab>(urlTab);
  if (lastUrlTab !== urlTab) {
    setLastUrlTab(urlTab);
    setTab(urlTab);
  }

  const auctions = useApiPages(
    (page) =>
      listAuctions(
        {
          q: term,
          status: OFFERABLE_AUCTION_STATUSES,
          page,
          pageSize: STEP,
        },
        user?.id,
      ),
    `search:auctions:${term}:${user?.id ?? "anon"}`,
    { enabled: Boolean(term) },
  );

  const causes = useApi(
    () => listCauses({ q: term }),
    `search:causes:${term}`,
    { enabled: Boolean(term) },
  );

  const members = useApi(() => searchUsers(term), `search:members:${term}`, {
    enabled: Boolean(term),
  });

  const shownCauses = useWindowedList(causes.data, term, STEP);
  const shownMembers = useWindowedList(members.data, term, STEP);

  const choose = (next: Tab) => {
    setTab(next);
    const query = new URLSearchParams(params.toString());
    query.set("tab", next);
    router.replace(`/cautare?${query.toString()}`, { scroll: false });
  };

  if (!term) {
    return (
      <EmptyState
        title="Caută pe bid4"
        description="Scrie ce te interesează: un obiect, o cauză sau numele unui membru."
      />
    );
  }

  const options = [
    {
      value: "licitatii" as const,
      label: <TabLabel text="Licitații" count={auctions.total ?? undefined} />,
    },
    {
      value: "cauze" as const,
      label: <TabLabel text="Cauze" count={causes.data?.length} />,
    },
    {
      value: "membri" as const,
      label: <TabLabel text="Membri" count={members.data?.length} />,
    },
  ];

  return (
    <div className="flex min-h-[70vh] flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Rezultate pentru „{term}”
        </h1>
      </div>

      <SegmentedControl
        ariaLabel="Tipul rezultatelor"
        variant="bubbles"
        options={options}
        value={tab}
        onChange={choose}
      />

      <div key={`${tab}:${term}`} className="animate-fade-up">
        {tab === "licitatii" ? (
          <Panel
            items={auctions.loading ? null : auctions.items}
            error={auctions.error}
            reload={auctions.reload}
            emptyTitle="Nicio licitație găsită"
            skeleton={<SkeletonGrid count={STEP} columns={5} />}
          >
            {(items) => (
              <>
                <p className="sr-only" aria-live="polite">
                  {countRo(
                    auctions.total ?? items.length,
                    "rezultat",
                    "rezultate",
                  )}
                </p>
                <AuctionGrid auctions={items} columns={5} />
                <LoadMore
                  hasMore={auctions.hasMore}
                  loading={auctions.loadingMore}
                  onReach={auctions.loadMore}
                  waiting={<SkeletonGrid count={5} columns={5} />}
                />
              </>
            )}
          </Panel>
        ) : null}

        {tab === "cauze" ? (
          <Panel
            items={shownCauses.items}
            error={causes.error}
            reload={causes.reload}
            emptyTitle="Nicio cauză găsită"
            skeleton={<CauseGrid causes={[]} loading skeletonCount={6} />}
          >
            {(items) => (
              <>
                <CauseGrid causes={items} />
                <LoadMore
                  hasMore={shownCauses.hasMore}
                  onReach={shownCauses.loadMore}
                />
              </>
            )}
          </Panel>
        ) : null}

        {tab === "membri" ? (
          <Panel
            items={shownMembers.items}
            error={members.error}
            reload={members.reload}
            emptyTitle="Niciun membru găsit"
            skeleton={<MemberSkeleton />}
          >
            {(items) => (
              <>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((member) => (
                    <li key={member.id}>
                      <Link
                        href={`/profil/${member.username}`}
                        className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-edge transition hover:ring-primary-500"
                      >
                        <Avatar
                          name={member.displayName}
                          src={member.avatarUrl}
                          size="md"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-display font-bold text-ink-900">
                            {member.displayName}
                          </span>
                          <span className="block truncate text-sm text-ink-500">
                            @{member.username}
                            {member.city ? ` · ${member.city}` : ""}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <LoadMore
                  hasMore={shownMembers.hasMore}
                  onReach={shownMembers.loadMore}
                />
              </>
            )}
          </Panel>
        ) : null}
      </div>
    </div>
  );
}

function MemberSkeleton() {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-edge"
        >
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-4 w-2/3 rounded-md" />
            <Skeleton className="mt-1.5 h-3.5 w-1/2 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TabLabel({ text, count }: { text: string; count?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      {text}
      <span
        aria-hidden={count === undefined}
        className="numeric inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/10 px-1.5 text-xs font-extrabold"
      >
        {count === undefined ? "" : count}
      </span>
    </span>
  );
}

function Panel<T>({
  items,
  error,
  reload,
  emptyTitle,
  skeleton,
  children,
}: {
  items: T[] | null;
  error: string | null;
  reload: () => void;
  emptyTitle: string;
  skeleton: React.ReactNode;
  children: (items: T[]) => React.ReactNode;
}) {
  if (error) {
    return (
      <ErrorState
        description={error}
        action={
          <Button variant="secondary" onClick={reload}>
            Încearcă din nou
          </Button>
        }
      />
    );
  }
  if (!items) return <>{skeleton}</>;
  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description="Încearcă un alt termen sau caută în altă categorie."
        compact
      />
    );
  }
  return <>{children(items)}</>;
}
