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
  UnreadBadge,
} from "@/components/ui";
import { AUCTION_CATEGORIES } from "@/lib/config";
import { listMyAuctions } from "@/lib/api/auctions";
import { getUnreadCounts } from "@/lib/api/inbox";
import { listMyCauses } from "@/lib/api/causes";
import { useApi } from "@/lib/hooks/useApi";
import { useInboxStream } from "@/lib/hooks/useInboxStream";
import { useAuth } from "@/lib/auth/AuthProvider";
import { setPageScrollLocked } from "@/components/layout/SmoothScroll";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/licitatii", label: "Licitații" },
  { href: "/cauze", label: "Cauze" },
];

const ACCOUNT_LINKS: {
  href: string;
  label: string;
  icon: keyof typeof Icons;
  group?: boolean;
}[] = [
  { href: "/cont", label: "Profil", icon: "account" },

  {
    href: "/cont/vanzari",
    label: "Vânzările mele",
    icon: "auction",
    group: true,
  },
  { href: "/cont/comenzi", label: "Comenzile mele", icon: "parcel" },
  { href: "/cont/urmarite", label: "Licitații urmărite", icon: "watchlist" },

  { href: "/cont/portofel", label: "Portofel", icon: "wallet", group: true },
  { href: "/cont/cauze", label: "Cauze", icon: "cause" },

  { href: "/cont/setari", label: "Setări", icon: "settings", group: true },
];

function MenuToggle({ open }: { open: boolean }) {
  const bar =
    "h-[2px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1.1)]";

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

function Panel({
  open,
  tone = "plain",
  fill = false,
  children,
}: {
  open: boolean;
  tone?: "plain" | "muted";
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-12 origin-top shadow-sm transition-[opacity,translate,visibility] duration-[260ms] ease-[cubic-bezier(0.2,0.7,0.3,1)] sm:top-14 lg:hidden",
        tone === "muted" ? "bg-ink-50" : "bg-white",
        fill && "h-[calc(100dvh-3rem)] sm:h-[calc(100dvh-3.5rem)]",
        open
          ? "visible translate-y-0 opacity-100"
          : "invisible -translate-y-2 opacity-0",
      )}
    >
      <div
        data-lenis-prevent
        className={cn(
          "px-4 pt-3 pb-4 sm:px-6",
          fill && "h-full overflow-x-hidden overflow-y-auto overscroll-contain",
        )}
      >
        {children}
      </div>
    </div>
  );
}

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
      className="group flex items-center gap-3 rounded-2xl py-2.5 pr-2.5 pl-2 font-display text-base font-bold text-ink-800 transition hover:bg-ink-50 hover:text-ink-900"
    >
      <span
        aria-hidden="true"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition group-hover:bg-primary-100"
      >
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
  focused?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!focused) return;

    let tries = 0;
    let timer = 0;

    const attempt = () => {
      const input = ref.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      if (document.activeElement !== input && tries++ < 10) {
        timer = window.setTimeout(attempt, 30);
      }
    };

    attempt();
    return () => window.clearTimeout(timer);
  }, [focused]);

  return (
    <div className="flex h-11 w-full items-center gap-2 rounded-xl bg-white px-3.5 ring-1 ring-ink-200 transition hover:ring-ink-300 focus-within:ring-primary-500 lg:h-9">
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

function AuthSwap({
  when,
  openWidth,
  className,
  children,
}: {
  when: "in" | "out";
  openWidth: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{ "--auth-swap": openWidth } as React.CSSProperties}
      className={cn(
        "invisible flex max-w-0 items-center overflow-hidden opacity-0 transition-[max-width,opacity,visibility] duration-200 ease-[var(--ease-out-soft)] *:shrink-0",
        when === "in"
          ? "signed-in:visible signed-in:max-w-(--auth-swap) signed-in:opacity-100"
          : "signed-out:visible signed-out:max-w-(--auth-swap) signed-out:opacity-100",
        className,
      )}
    >
      {children}
    </span>
  );
}

function InboxMark({
  href,
  icon,
  label,
  count,
  active,
}: {
  href: string;
  icon: "inbox" | "notification";
  label: string;
  count: number;
  active: boolean;
}) {
  const Icon = Icons[icon];

  return (
    <Link
      href={href}
      aria-label={count > 0 ? `${label}, ${count} necitite` : label}
      title={label}
      className={cn(iconButton(active, "h-9 w-9"), "relative")}
    >
      <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
      <UnreadBadge
        aria-hidden="true"
        count={count}
        size="xs"
        max={9}
        tone="bg-danger-600 text-white ring-2 ring-white"
        className="absolute top-1 right-1"
      />
    </Link>
  );
}

function iconButton(active: boolean, size = "h-10 w-10") {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-xl transition",
    size,
    active
      ? "bg-ink-75 text-ink-900"
      : "text-ink-700 hover:bg-ink-50 hover:text-ink-900",
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

  const menuOpen = openPanel === "account";
  const mine = { enabled: menuOpen && Boolean(user) };
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

  const counts: Record<string, number | undefined> = {
    "/cont/vanzari": mySales?.filter(
      (item) => item.status === "LIVE" || item.status === "RESERVED",
    ).length,
    "/cont/cauze": myCauses?.filter(
      (item) => item.status === "ACTIVE" || item.status === "APPROVED",
    ).length,
  };

  useInboxStream();

  const { data: unreadCounts } = useApi(
    () => getUnreadCounts(),
    `inbox:unread:${user?.id}`,
    { enabled: Boolean(user) },
  );
  const unreadMessages = unreadCounts?.messages ?? 0;
  const unreadNotifications = unreadCounts?.notifications ?? 0;

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
    router.push(
      trimmed ? `/cautare?q=${encodeURIComponent(trimmed)}` : "/cautare",
    );
    close();
  };

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

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

          <AuthSwap
            when="out"
            openWidth="2.5rem"
            className="signed-in:-ml-1 lg:hidden"
          >
            <Link
              href="/autentificare"
              aria-label="Intră în cont"
              className={cn(
                iconButton(isActive("/autentificare"), "h-9 w-9"),
                "rounded-full",
              )}
            >
              <Icons.accountRound
                aria-hidden="true"
                className="h-5 w-5 shrink-0"
              />
            </Link>
          </AuthSwap>

          <AuthSwap
            when="in"
            openWidth="2.5rem"
            className="signed-out:-ml-1 lg:hidden"
          >
            <InboxMark
              href="/cont/inbox"
              icon="inbox"
              label="Mesaje și notificări"
              count={unreadMessages + unreadNotifications}
              active={isActive("/cont/inbox")}
            />
          </AuthSwap>

          <AuthSwap
            when="in"
            openWidth="2.5rem"
            className="signed-out:-ml-1 hidden lg:block"
          >
            <InboxMark
              href="/cont/inbox"
              icon="inbox"
              label="Mesaje"
              count={unreadMessages}
              active={
                pathname === "/cont/inbox" || isActive("/cont/inbox/conv")
              }
            />
          </AuthSwap>

          <AuthSwap
            when="in"
            openWidth="2.5rem"
            className="signed-out:-ml-1 hidden lg:block"
          >
            <InboxMark
              href="/cont/inbox/notificari"
              icon="notification"
              label="Notificări"
              count={unreadNotifications}
              active={isActive("/cont/inbox/notificari")}
            />
          </AuthSwap>

          <AuthSwap when="in" openWidth="10rem" className="signed-in:ml-2">
            <ButtonLink
              href="/cont/vanzari/nou"
              size="sm"
              className="h-8 [--btn-depth:0px] sm:h-9"
            >
              Vinde acum
            </ButtonLink>
          </AuthSwap>
          <div
            className="relative hidden signed-in:-ml-1 lg:flex"
            ref={accountRef}
          >
            <button
              type="button"
              onClick={() => toggle("account")}
              aria-expanded={openPanel === "account"}
              aria-haspopup="menu"
              aria-label="Contul meu"
              className={cn(
                "inline-flex h-9 items-center rounded-2xl px-2.5 font-display text-[15px] font-bold whitespace-nowrap transition signed-in:pl-2",
                openPanel === "account"
                  ? "bg-ink-75 text-ink-900"
                  : "text-ink-700 hover:bg-ink-50 hover:text-ink-900",
              )}
            >
              <AuthSwap when="in" openWidth="2.75rem">
                {user ? (
                  <Avatar
                    name={user.displayName}
                    src={user.avatarUrl}
                    accountType={user.accountType}
                    size="xs"
                    className="mr-2.5 ml-0.5"
                  />
                ) : status === "loading" ? (
                  <Skeleton className="mr-2.5 ml-0.5 h-7 w-7 rounded-full" />
                ) : (
                  <span className="mr-2.5 ml-0.5 block h-7 w-7" />
                )}
              </AuthSwap>
              <AuthSwap when="out" openWidth="8rem">
                <span className="mr-2 flex items-center gap-2">
                  <Icons.accountRound
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />
                  Contul meu
                </span>
              </AuthSwap>
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
        </div>
      </div>

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

      <Panel open={openPanel === "nav"} fill>
        <nav aria-label="Navigare" className="flex flex-col gap-2">
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

          <Link
            href="/cont/cauze/noua"
            onClick={close}
            className="group relative overflow-hidden rounded-2xl bg-primary-50 p-3.5 transition hover:bg-primary-100"
          >
            <p className="max-w-[60%] font-display text-base leading-snug font-extrabold text-primary-900">
              Strânge fonduri pentru cei care au nevoie
            </p>

            <span className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary-600 text-white px-3 py-2 font-display text-sm font-bold transition">
              Propune o cauză
              <Icons.forward
                aria-hidden="true"
                className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5"
              />
            </span>
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
          <PanelRow
            href="/ajutor"
            icon={<Icons.help className="h-5 w-5 shrink-0" />}
            label="Centru de ajutor"
            onNavigate={close}
          />
        </nav>
      </Panel>
    </header>
  );
}
