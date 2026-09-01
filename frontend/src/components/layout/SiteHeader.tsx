"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { AccountMenu } from "./AccountMenu";
import { CategoryTrail } from "./CategoryTrail";
import {
  Avatar,
  ButtonLink,
  CategoryIcon,
  Illustration,
  Logo,
  Skeleton,
} from "@/components/ui";
import { AUCTION_CATEGORIES } from "@/lib/config";
import { listMyAuctions } from "@/lib/api/auctions";
import { listMyBids } from "@/lib/api/bids";
import { listMyCauses } from "@/lib/api/causes";
import { useApi } from "@/lib/hooks/useApi";
import { useAuth } from "@/lib/auth/AuthProvider";
import { setPageScrollLocked } from "@/components/layout/SmoothScroll";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/licitatii", label: "Licitații" },
  { href: "/cauze", label: "Cauze" },
];

/**
 * The account menu, grouped the way the account is used rather than
 * alphabetically: what I am buying, then what I am selling, then what I support,
 * then the account itself. Each carries the icon it is known by elsewhere in the
 * app, so the menu is scanned rather than read.
 */
const ACCOUNT_LINKS: {
  href: string;
  label: string;
  icon: keyof typeof Icons;
  group?: boolean;
}[] = [
  { href: "/cont", label: "Contul meu", icon: "account" },

  {
    href: "/cont/licitatiile-mele",
    label: "Licitațiile mele",
    icon: "auction",
    group: true,
  },
  { href: "/cont/comenzi", label: "Comenzile mele", icon: "parcel" },

  {
    href: "/cont/vanzari",
    label: "Vânzările mele",
    icon: "wallet",
    group: true,
  },
  { href: "/cont/cauze", label: "Cauzele mele", icon: "cause" },

  { href: "/cont/setari", label: "Setări", icon: "settings", group: true },
];

function MenuToggle({ open }: { open: boolean }) {
  // 2px bars in a 20px box: the same weight as the lucide icons beside them.
  const bar =
    "h-[2px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1.1)]";

  // Bars 4px apart puts the outer two 6px either side — how far they travel to cross.
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 flex-col items-start justify-center gap-[4px]"
    >
      <span
        className={cn(bar, open ? "w-5 translate-y-[6px] rotate-45" : "w-5")}
      />
      <span className={cn(bar, open ? "w-0 opacity-0" : "w-[11px]")} />
      <span
        className={cn(
          bar,
          open ? "w-5 -translate-y-[6px] -rotate-45" : "w-[15px]",
        )}
      />
    </span>
  );
}

/**
 * Both panels stay mounted so they animate out as well as in. `visibility` is in
 * the transition on purpose: it takes a closed panel's links out of the tab order.
 */
function Panel({
  open,
  tone = "plain",
  children,
}: {
  open: boolean;
  /** "muted" tints the sheet so white boxes inside it read as raised. */
  tone?: "plain" | "muted";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        // top-12/14 rather than top-full: the header now carries the category
        // rail as well, and top-full would drop the panel below it. Pinned to
        // the bar's own height, the panel opens over the rail, which can then
        // stay mounted instead of vanishing and shifting the page. These two
        // numbers are the bar's height and have to move with it.
        "absolute inset-x-0 top-12 origin-top px-4 pt-3 pb-4 shadow-sm transition-[opacity,translate,visibility] duration-[260ms] ease-[cubic-bezier(0.2,0.7,0.3,1)] sm:top-14 sm:px-6 lg:hidden",
        tone === "muted" ? "bg-ink-50" : "bg-white",
        open
          ? "visible translate-y-0 opacity-100"
          : "invisible -translate-y-2 opacity-0",
      )}
    >
      {children}
    </div>
  );
}

/**
 * One destination in the mobile menu.
 *
 * <p>A label and a mark, and no explanatory line: "Vezi licitațiile" does not need one, and a
 * second line under every row turns a short menu into a wall. The one entry that is a pitch
 * rather than a place is built separately, so it can look like a pitch.
 */
function PanelRow({
  href,
  icon,
  label,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="group flex items-center gap-2.5 rounded-2xl px-3 py-3 font-display text-[15px] font-bold text-ink-800 ring-1 ring-edge transition hover:bg-ink-50 hover:text-ink-900"
    >
      <span aria-hidden="true" className="text-ink-500">
        {icon}
      </span>
      {label}
      <Icons.forward
        aria-hidden="true"
        className="ml-auto h-4.5 w-4.5 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}

function HeaderSearch({
  value,
  onChange,
  focused = false,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Takes the caret when the panel it lives in opens. */
  focused?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) return;

    // The panel leaves `visibility: hidden` in the same commit, and a browser will
    // not focus an element it still computes as hidden. Ask until it takes.
    let tries = 0;
    let timer = 0;

    const attempt = () => {
      const input = ref.current;
      if (!input) return;
      // preventScroll, because this panel is absolutely positioned inside a
      // sticky header: in the document's own coordinates it sits at the very
      // top, so a plain focus() asks the browser to scroll there to reveal it
      // and the page jumps away from wherever the reader actually was.
      input.focus({ preventScroll: true });
      if (document.activeElement !== input && tries++ < 10) {
        timer = window.setTimeout(attempt, 30);
      }
    };

    attempt();
    return () => window.clearTimeout(timer);
  }, [focused]);

  return (
    <div className="flex h-11 w-full items-center gap-2 rounded-xl bg-ink-100 px-3.5 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500 lg:h-9">
      <Icons.search
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-ink-500"
      />
      <input
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Caută pe bid4..."
        aria-label="Caută pe bid4..."
        className="min-w-0 flex-1 bg-transparent text-base text-ink-900 placeholder:text-ink-500 focus:outline-none sm:text-[15px]"
      />
    </div>
  );
}

const CATEGORY_TILE =
  "flex items-center gap-2 rounded-xl px-2.5 py-2.5 text-[15px] font-bold whitespace-nowrap ring-1 transition sm:gap-2.5 sm:px-3";

export function CategoryTiles({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      <Link
        href="/licitatii"
        role="menuitem"
        onClick={onNavigate}
        className={cn(
          CATEGORY_TILE,
          "bg-canvas text-primary-800 ring-edge hover:bg-white hover:ring-primary-300",
        )}
      >
        <Icons.auction aria-hidden="true" className="h-4.5 w-4.5 shrink-0" />
        <span className="truncate">Toate licitațiile</span>
      </Link>

      {AUCTION_CATEGORIES.map((category) => (
        <Link
          key={category.id}
          href={`/licitatii?category=${category.id}`}
          role="menuitem"
          onClick={onNavigate}
          className={cn(
            CATEGORY_TILE,
            "bg-canvas text-ink-800 ring-edge hover:bg-white hover:ring-ink-300",
          )}
        >
          <CategoryIcon
            set="categories"
            id={category.id}
            className="h-4.5 w-4.5"
            sizes="18px"
          />
          <span className="truncate">{category.label}</span>
        </Link>
      ))}
    </div>
  );
}

function iconButton(active: boolean, size = "h-10 w-10") {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-xl transition",
    size,
    active
      ? "bg-ink-100 text-ink-900"
      : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, status, logout, isStaff, isAdmin } = useAuth();

  const [panel, setPanel] = useState<{
    path: string;
    which: "nav" | "account" | "search" | "auctions" | null;
  }>({ path: pathname, which: null });

  const openPanel = panel.path === pathname ? panel.which : null;
  const close = () => setPanel({ path: pathname, which: null });

  const signOut = async () => {
    close();
    await logout();
    router.push("/");
  };
  const toggle = (which: "nav" | "account" | "search" | "auctions") =>
    setPanel((current) => ({
      path: pathname,
      which:
        current.path === pathname && current.which === which ? null : which,
    }));

  /**
   * What is still open on each list, shown beside it.
   *
   * <p>Fetched only while the menu is, and under the same cache keys the
   * account pages use — so opening the menu after visiting one of them costs
   * nothing, and opening it first means the page it leads to is already loaded.
   * Comenzi has no count because it has no endpoint yet.
   */
  const menuOpen = openPanel === "account";
  const mine = { enabled: menuOpen && Boolean(user) };
  const { data: myBids } = useApi(
    () => listMyBids(user!.id),
    `my-bids:${user?.id}`,
    mine,
  );
  const { data: mySales } = useApi(
    () => listMyAuctions(user!.id),
    `my-sales:${user?.id}`,
    mine,
  );
  const { data: myCauses } = useApi(
    () => listMyCauses(user!.id),
    `my-causes:${user?.id}`,
    mine,
  );

  // Only what is still running: a list of everything the account ever did is a
  // number that never goes down and so never means anything.
  const counts: Record<string, number | undefined> = {
    "/cont/licitatiile-mele": myBids?.filter(
      (item) =>
        item.myTopBid.status !== "WON" && item.myTopBid.status !== "LOST",
    ).length,
    // Reserved counts: the seller has chosen and now owes the buyer a delivery,
    // which is exactly the kind of thing a badge should keep in front of them.
    "/cont/vanzari": mySales?.filter(
      (item) => item.status === "LIVE" || item.status === "RESERVED",
    ).length,
    "/cont/cauze": myCauses?.filter(
      (item) => item.status === "ACTIVE" || item.status === "APPROVED",
    ).length,
  };

  const [query, setQuery] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openPanel !== "account") return;
    const dismiss = () => setPanel({ path: pathname, which: null });
    const onPointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) dismiss();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openPanel, pathname]);

  // The page behind the panel holds still. The scrollbar's width is paid back to
  // <body>, or the header jumps sideways as it disappears.
  const panelIsOpen = openPanel === "nav" || openPanel === "search";
  useEffect(() => {
    if (!panelIsOpen) return;
    const root = document.documentElement;
    const scrollbar = window.innerWidth - root.clientWidth;
    const previous = {
      overflow: root.style.overflow,
      paddingRight: document.body.style.paddingRight,
    };
    root.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    setPageScrollLocked(true);
    return () => {
      root.style.overflow = previous.overflow;
      document.body.style.paddingRight = previous.paddingRight;
      setPageScrollLocked(false);
    };
  }, [panelIsOpen]);

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    // Everything, not just the catalogue: somebody typing a name is looking for
    // a member, and sending them to a listing filter answered the wrong question.
    router.push(
      trimmed ? `/cautare?q=${encodeURIComponent(trimmed)}` : "/cautare",
    );
    close();
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  /**
   * Where the category rail belongs: the home page, and any single listing or
   * cause. Those are the pages where somebody is looking at one thing and might
   * want a different kind of thing.
   *
   * Deliberately not on /licitatii or /cauze, whose own filters already do this
   * better, and not on the account pages, where it would hang a shop window
   * across somebody's admin.
   */
  const showTrail =
    pathname === "/" ||
    /^\/licitatii\/[^/]+$/.test(pathname) ||
    /^\/cauze\/[^/]+$/.test(pathname);

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="mx-auto flex h-12 w-full max-w-7xl items-center gap-2 px-4 sm:h-14 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => toggle("nav")}
          aria-label={openPanel === "nav" ? "Închide meniul" : "Meniu"}
          aria-expanded={openPanel === "nav"}
          className={cn(
            "-ml-1.5 lg:hidden",
            iconButton(openPanel === "nav", "h-9 w-9"),
          )}
        >
          <MenuToggle open={openPanel === "nav"} />
        </button>
        <Logo size="sm" className="shrink-0 mb-1 sm:mb-2" />

        <nav aria-label="Navigare principală" className="ml-3 hidden lg:flex">
          {/* Licitații used to open a panel of categories. The rail under the
              header carries those now, and a menu that repeats what is already
              on screen is one more thing to dismiss. */}
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-xl px-3 py-2 font-display text-[15px] font-bold whitespace-nowrap transition",
                isActive(item.href)
                  ? "text-primary-700"
                  : "text-ink-700 hover:text-ink-900",
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/cont/cauze/noua"
            className="ml-1 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-display text-[15px] font-bold whitespace-nowrap text-primary-700 transition hover:bg-primary-50"
          >
            <Icons.donation aria-hidden="true" className="h-4 w-4 shrink-0" />
            Strânge fonduri
          </Link>
        </nav>
        <form
          onSubmit={search}
          role="search"
          className="ml-auto hidden w-64 lg:block"
        >
          <HeaderSearch value={query} onChange={setQuery} />
        </form>
        <div className="ml-auto flex items-center gap-1 lg:ml-3">
          <button
            type="button"
            onClick={() => toggle("search")}
            aria-label={openPanel === "search" ? "Închide căutarea" : "Caută"}
            aria-expanded={openPanel === "search"}
            className={cn(
              "lg:hidden",
              iconButton(openPanel === "search", "h-9 w-9"),
            )}
          >
            {openPanel === "search" ? (
              <Icons.close aria-hidden="true" className="h-5 w-5 shrink-0" />
            ) : (
              <Icons.search aria-hidden="true" className="h-5 w-5 shrink-0" />
            )}
          </button>

          {/* Saved listings, beside the account rather than inside it: it is a
              place people come back to, and a menu is where things go to be
              looked for. */}
          <Link
            href="/cont/salvate"
            aria-label="Anunțuri salvate"
            className={iconButton(isActive("/cont/salvate"))}
          >
            <Icons.watchlist aria-hidden="true" className="h-5 w-5 shrink-0" />
          </Link>

          {status === "loading" ? (
            /* The signed-out trigger's own 149px footprint, which is what most
               visits resolve to, so that swap moves nothing. Reserving the
               wider signed-in row instead would hold every visitor's header
               open around a button most of them never get. */
            <Skeleton className="hidden h-9 w-[149px] rounded-2xl lg:block" />
          ) : (
            <>
              {user ? (
                /* Flat: --btn-depth off. The 3D edge is for buttons on a
                   page, and among the bar's other controls a raised one
                   reads as a stray card. */
                <ButtonLink
                  href="/cont/vanzari/nou"
                  size="sm"
                  className="animate-pop-in [--btn-depth:0px]"
                >
                  Vinde acum
                </ButtonLink>
              ) : null}
              {/* flex, or the inline-level button rides 2px above the other controls. */}
              <div className="relative hidden lg:flex" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => toggle("account")}
                  aria-expanded={openPanel === "account"}
                  aria-haspopup="menu"
                  aria-label="Contul meu"
                  className={cn(
                    // h-9 whoever is looking, so signing in swaps what is
                    // inside the trigger without resizing the trigger. The
                    // avatar is xs for the same reason: sm is 36px and would
                    // fill the pill edge to edge.
                    "inline-flex h-9 animate-pop-in items-center gap-2 rounded-2xl px-2.5 font-display text-[15px] font-bold whitespace-nowrap transition",
                    openPanel === "account"
                      ? "bg-ink-100 text-ink-900"
                      : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
                  )}
                >
                  {user ? (
                    <Avatar
                      name={user.displayName}
                      src={user.avatarUrl}
                      accountType={user.accountType}
                      size="xs"
                    />
                  ) : (
                    <>
                      <Icons.accountRound
                        aria-hidden="true"
                        className="h-5 w-5 shrink-0"
                      />
                      Contul meu
                    </>
                  )}
                  <Icons.expand
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 shrink-0 text-ink-500 transition-transform duration-200",
                      openPanel === "account" && "rotate-180",
                    )}
                  />
                </button>

                {openPanel === "account" ? (
                  <div
                    role="menu"
                    className={cn(
                      // z-50: the category rail and the page below both paint
                      // after this in document order, and the menu has to
                      // clear them both.
                      "absolute top-full right-0 z-50 mt-2 animate-pop-in rounded-2xl bg-white shadow-sm ring-1 ring-line",
                      user ? "w-72 p-1.5" : "w-80 p-4",
                    )}
                  >
                    <AccountMenu
                      user={user}
                      isStaff={isStaff}
                      isAdmin={isAdmin}
                      links={ACCOUNT_LINKS}
                      counts={counts}
                      onNavigate={close}
                      onSignOut={signOut}
                      itemRole="menuitem"
                    />
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inside the header, so it sticks with it and shares its stacking
          context rather than chasing it with a second sticky. It stays mounted
          while a mobile panel is open — the panel is drawn over it — because
          unmounting it moved the whole page up by its height. */}
      {showTrail ? <CategoryTrail /> : null}

      <button
        type="button"
        aria-label="Închide"
        onClick={close}
        tabIndex={panelIsOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 top-12 -z-10 cursor-default bg-ink-900/20 transition-[opacity,visibility] duration-[260ms] sm:top-14 lg:hidden",
          panelIsOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      />

      <Panel open={openPanel === "search"}>
        <form onSubmit={search} role="search">
          <HeaderSearch
            value={query}
            onChange={setQuery}
            focused={openPanel === "search"}
          />
        </form>
      </Panel>

      <Panel open={openPanel === "nav"}>
        <nav aria-label="Navigare" className="flex flex-col gap-2">
          {/* The account comes first: on a phone there is no corner to hang a
              dropdown off, so it lives inline.

              The tint belongs to the band, not the box. Negative margins pull it
              out to the sheet's edges so it reads as a section of its own, with
              the account sitting on it as a white card. Everything below stays on
              the sheet's white. */}
          <div className="-mx-4 -mt-3 bg-ink-50 px-4 py-3 sm:-mx-6 sm:px-6">
            <div className="rounded-2xl bg-white p-3">
              <AccountMenu
                user={user}
                isStaff={isStaff}
                isAdmin={isAdmin}
                links={ACCOUNT_LINKS}
                counts={counts}
                onNavigate={close}
                onSignOut={signOut}
              />
            </div>
          </div>

          {/* The one thing on this menu that is an invitation rather than a
              destination, so it is shaped like one and nothing else is. */}
          <Link
            href="/cont/cauze/noua"
            onClick={close}
            className="group relative overflow-hidden rounded-2xl bg-primary-50 p-3.5 transition hover:bg-primary-100"
          >
            <p className="max-w-[60%] font-display text-base leading-snug font-extrabold text-primary-900">
              Strânge fonduri pentru cei care au nevoie
            </p>

            <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary-600/90 text-white px-3 py-2 font-display text-sm font-bold transition">
              Propune o cauză
              <Icons.forward
                aria-hidden="true"
                className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              />
            </span>
            {/* Bottom-right, behind the text. Swap the source for the artwork
                you want; the box is sized so a taller one crops rather than
                pushing the button around. */}
            <Illustration
              src="mascot-heart"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-2 -bottom-1 h-24 w-24"
              sizes="96px"
            />
          </Link>

          <PanelRow
            href="/cauze"
            icon={<Icons.cause className="h-5 w-5 shrink-0" />}
            label="Descoperă cauzele"
            onNavigate={close}
          />
          <PanelRow
            href="/licitatii"
            icon={<Icons.auction className="h-5 w-5 shrink-0" />}
            label="Vezi licitațiile"
            onNavigate={close}
          />
        </nav>
      </Panel>
    </header>
  );
}
