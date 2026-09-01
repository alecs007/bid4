"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { AuctionGrid } from "@/components/auctions/AuctionCard";
import { CauseCard } from "@/components/causes/CauseCard";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  SegmentedControl,
  SkeletonGrid,
} from "@/components/ui";
import { listAuctions } from "@/lib/api/auctions";
import { listCauses } from "@/lib/api/causes";
import { searchUsers } from "@/lib/api/users";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PAGINATION } from "@/lib/config";
import { useApi } from "@/lib/hooks/useApi";
import { OFFERABLE_AUCTION_STATUSES } from "@/lib/types";
import { countRo } from "@/lib/utils/plural";

/** Mirrors the @Size bound the API puts on a search term. */
const MAX_TERM_LENGTH = 120;

type Tab = "licitatii" | "cauze" | "membri";

const TABS: Tab[] = ["licitatii", "cauze", "membri"];

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

/**
 * One term, three answers.
 *
 * <p>All three run at once rather than on demand, because the counts on the tabs are the point:
 * they are what tells somebody their thing is under "Membri" and saves them typing it again. Three
 * requests for one search is the price of that, and they are small.
 */
export function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  // Trimmed to what the API accepts: a pasted paragraph should narrow the
  // results, not blank the page with a 400.
  const term = (params.get("q") ?? "").slice(0, MAX_TERM_LENGTH).trim();

  // The URL decides which tab is open; the state exists only so a click lands
  // instantly instead of waiting on the router. Adjusted during render rather
  // than in an effect, which is what React asks for when state has to follow
  // something outside it — without this the initial value stuck, and a second
  // search on the same route kept whichever tab was open for the first.
  const urlTab: Tab = isTab(params.get("tab"))
    ? (params.get("tab") as Tab)
    : "licitatii";
  const [tab, setTab] = useState<Tab>(urlTab);
  const [lastUrlTab, setLastUrlTab] = useState<Tab>(urlTab);
  if (lastUrlTab !== urlTab) {
    setLastUrlTab(urlTab);
    setTab(urlTab);
  }

  const auctions = useApi(
    () =>
      listAuctions(
        {
          q: term,
          status: OFFERABLE_AUCTION_STATUSES,
          pageSize: PAGINATION.MAX_PAGE_SIZE,
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

  const choose = (next: Tab) => {
    setTab(next);
    // The tab rides in the URL so a result set can be linked to, but it is
    // local state first: switching tabs must not refetch what is already here.
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

  // The count rides inside the label rather than in the control's own `count`
  // slot, so the badge exists from the first paint and the row never changes
  // width when the three requests land. A tab bar that grows under the cursor
  // is the one shift on this page a reader would actually feel.
  const options = [
    {
      value: "licitatii" as const,
      label: <TabLabel text="Licitații" count={auctions.data?.total} />,
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
    // A floor under the results, so a tab with two hits does not pull the footer
    // halfway up the screen and one tab does not jump as it replaces another.
    <div className="flex min-h-[70vh] flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
          Rezultate pentru „{term}”
        </h1>
      </div>

      {/* Bubbles rather than one grey rail: this row spans the page, and the
          rail behind it read as a band drawn across the results. */}
      <SegmentedControl
        ariaLabel="Tipul rezultatelor"
        variant="bubbles"
        options={options}
        value={tab}
        onChange={choose}
      />

      {/* Keyed on the tab and the term so the fade replays on a switch and on a
          new search, rather than results silently swapping in place. */}
      <div key={`${tab}:${term}`} className="animate-fade-in">
      {tab === "licitatii" ? (
        <Panel
          state={auctions}
          isEmpty={(data) => data.items.length === 0}
          emptyTitle="Nicio licitație găsită"
          skeleton={<SkeletonGrid count={8} columns={4} />}
        >
          {(data) => (
            <>
              <p className="sr-only" aria-live="polite">
                {countRo(data.total, "rezultat", "rezultate")}
              </p>
              <AuctionGrid auctions={data.items} columns={4} />
            </>
          )}
        </Panel>
      ) : null}

      {tab === "cauze" ? (
        <Panel
          state={causes}
          isEmpty={(data) => data.length === 0}
          emptyTitle="Nicio cauză găsită"
          skeleton={<SkeletonGrid count={3} columns={3} />}
        >
          {(data) => (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((cause) => (
                <CauseCard key={cause.id} cause={cause} />
              ))}
            </div>
          )}
        </Panel>
      ) : null}

      {tab === "membri" ? (
        <Panel
          state={members}
          isEmpty={(data) => data.length === 0}
          emptyTitle="Niciun membru găsit"
          skeleton={<SkeletonGrid count={6} columns={3} />}
        >
          {(data) => (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((member) => (
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
          )}
        </Panel>
      ) : null}
      </div>
    </div>
  );
}

/**
 * A tab's label and its count, with the badge's box reserved before the number is known.
 *
 * <p>Not the control's own `count` prop, because that renders nothing until there is a number,
 * and the row jumping wider a beat after the page settles is exactly the shift this page should
 * not have.
 */
function TabLabel({ text, count }: { text: string; count?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      {text}
      <span
        aria-hidden={count === undefined}
        className="numeric inline-flex min-w-[1.6em] justify-center rounded-full bg-black/10 px-1.5 py-0.5 text-xs font-extrabold"
      >
        {count === undefined ? " " : count}
      </span>
    </span>
  );
}

/**
 * The three states every tab has, in one place.
 *
 * <p>Each tab loads on its own and can fail on its own, so each needs its own skeleton, its own
 * retry and its own empty line. Writing that out three times is how two of them drift.
 */
function Panel<T>({
  state,
  isEmpty,
  emptyTitle,
  skeleton,
  children,
}: {
  state: {
    data: T | null;
    loading: boolean;
    error: string | null;
    reload: () => void;
  };
  isEmpty: (data: T) => boolean;
  emptyTitle: string;
  skeleton: React.ReactNode;
  children: (data: T) => React.ReactNode;
}) {
  if (state.error) {
    return (
      <ErrorState
        description={state.error}
        action={
          <Button variant="secondary" onClick={state.reload}>
            Încearcă din nou
          </Button>
        }
      />
    );
  }
  if (!state.data) return <>{skeleton}</>;
  if (isEmpty(state.data)) {
    return (
      <EmptyState
        title={emptyTitle}
        description="Încearcă un alt termen sau caută în altă categorie."
        compact
      />
    );
  }
  return <>{children(state.data)}</>;
}
