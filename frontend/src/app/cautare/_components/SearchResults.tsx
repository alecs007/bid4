"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { AuctionGrid } from "@/components/auctions/AuctionCard";
import { CauseGrid } from "@/components/causes/CauseCard";
import {
  Avatar,
  Button,
  EmptyState,
  ErrorState,
  SegmentedControl,
  Skeleton,
  SkeletonGrid,
} from "@/components/ui";
import { listAuctions } from "@/lib/api/auctions";
import { listCauses } from "@/lib/api/causes";
import { searchUsers } from "@/lib/api/users";
import { useAuth } from "@/lib/auth/AuthProvider";
import { PAGINATION } from "@/lib/config";
import { useApi, useApiPages } from "@/lib/hooks/useApi";
import { OFFERABLE_AUCTION_STATUSES } from "@/lib/types";
import { countRo } from "@/lib/utils/plural";

/** Mirrors the @Size bound the API puts on a search term. */
const MAX_TERM_LENGTH = 120;

/** How much of each tab arrives at a time, and how much more each reach adds. */
const STEP = PAGINATION.DEFAULT_PAGE_SIZE;

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
 * requests for one search is the price of that, and each asks for a page, not a catalogue.
 *
 * <p>The three hooks stay mounted whichever tab is open, so switching tabs is a render and not a
 * fetch — and a tab comes back with as much of it loaded as the reader had scrolled to.
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

  // The only one of the three the API pages for us, and the one that needs it:
  // a common word matches half the catalogue.
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

  // Neither /causes nor /users takes a page, so those two are windowed over
  // what arrived rather than over what was asked for. It saves no request, but
  // it does stop fifty cards and fifty photographs being built for somebody who
  // will look at six.
  const shownCauses = useWindow(causes.data, term, STEP);
  const shownMembers = useWindow(members.data, term, STEP);

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
  //
  // Every count is the whole answer, not what has been fetched of it: the
  // auction number comes off the page's `total`, the other two off the full
  // list behind the window.
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

      {/* Keyed on the tab and the term so the rise replays on a switch and on a
          new search, rather than results silently swapping in place. The
          photographs inside fade in on their own as they decode, so a switch
          reads as one movement instead of a grid assembling itself. */}
      <div key={`${tab}:${term}`} className="animate-fade-up">
        {tab === "licitatii" ? (
          <Panel
            items={auctions.loading ? null : auctions.items}
            error={auctions.error}
            reload={auctions.reload}
            emptyTitle="Nicio licitație găsită"
            skeleton={<SkeletonGrid count={STEP} columns={4} />}
          >
            {(items) => (
              <>
                <p className="sr-only" aria-live="polite">
                  {countRo(auctions.total ?? items.length, "rezultat", "rezultate")}
                </p>
                <AuctionGrid auctions={items} columns={4} />
                <More
                  hasMore={auctions.hasMore}
                  loading={auctions.loadingMore}
                  onReach={auctions.loadMore}
                  waiting={<SkeletonGrid count={4} columns={4} />}
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
            // The cause grid's own skeleton. SkeletonGrid draws auction cards:
            // portrait, where a cause card is 4/3 and a third taller.
            skeleton={<CauseGrid causes={[]} loading skeletonCount={6} />}
          >
            {(items) => (
              <>
                <CauseGrid causes={items} />
                <More
                  hasMore={shownCauses.hasMore}
                  loading={false}
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
                <More
                  hasMore={shownMembers.hasMore}
                  loading={false}
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

/**
 * The member rows, which are rows and not cards.
 *
 * <p>Their own shape rather than the card grid's: a member is an avatar and two lines in a 68px
 * box, and standing twelve auction-card skeletons in for them promised something five times as
 * tall as what arrived.
 */
function MemberSkeleton() {
  return (
    <div
      role="status"
      aria-label="Se încarcă"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        // p-3 around a 44px avatar is the row's own 68px, without writing 68.
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

/**
 * A list the API only answers in full, revealed a step at a time.
 *
 * <p>The count resets when the term does, which is the only thing that makes the list a different
 * list. Adjusted during render against a remembered term rather than in an effect — the same
 * pattern the open tab uses above, and for the same reason.
 */
function useWindow<T>(
  all: T[] | null,
  resetKey: string,
  step: number,
): { items: T[] | null; hasMore: boolean; loadMore: () => void } {
  const [shown, setShown] = useState(step);
  const [lastKey, setLastKey] = useState(resetKey);
  if (lastKey !== resetKey) {
    setLastKey(resetKey);
    setShown(step);
  }

  const loadMore = useCallback(
    () => setShown((current) => current + step),
    [step],
  );

  return {
    items: all ? all.slice(0, shown) : null,
    hasMore: (all?.length ?? 0) > shown,
    loadMore,
  };
}

/**
 * The bottom of a list that is not finished yet.
 *
 * <p>The sentinel is disconnected while a page is in flight and once there is nothing left to
 * ask for. An observer left watching re-fires on every scroll that keeps it in view, and each of
 * those would otherwise be a request; this way there is at most one outstanding, ever.
 */
function More({
  hasMore,
  loading,
  onReach,
  waiting,
}: {
  hasMore: boolean;
  loading: boolean;
  onReach: () => void;
  /** Shown in place of the results that are on their way. */
  waiting?: React.ReactNode;
}) {
  if (!hasMore && !loading) return null;

  return (
    <div className="mt-3 sm:mt-4">
      {loading ? waiting : null}
      <Sentinel active={hasMore && !loading} onReach={onReach} />
    </div>
  );
}

function Sentinel({
  active,
  onReach,
}: {
  active: boolean;
  onReach: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    // 400px of lead, so the next results are usually in by the time the reader
    // arrives — and not so much that a tall screen pulls three pages at once.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) onReach();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active, onReach]);

  return <div ref={ref} aria-hidden="true" className="h-px w-full" />;
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
      {/* h-5 and min-w-5 rather than padding: empty, the box had nothing to give
          it a line and collapsed to a 19x4 sliver, which read as a dash under a
          rounded-full that never got to be round. Fixed, it is the same 20px
          circle before the number as after it. */}
      <span
        aria-hidden={count === undefined}
        className="numeric inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black/10 px-1.5 text-xs font-extrabold"
      >
        {count === undefined ? "" : count}
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
  items,
  error,
  reload,
  emptyTitle,
  skeleton,
  children,
}: {
  /** null while the first page is still in flight; empty is an answer, not a wait. */
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
