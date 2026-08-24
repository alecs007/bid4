"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { Avatar, ButtonLink, Logo, Skeleton } from "@/components/ui";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils/cn";

const NAV = [
  { href: "/licitatii", label: "Licitații" },
  { href: "/cauze", label: "Cauze" },
  { href: "/produse", label: "Produse" },
];

const ACCOUNT_LINKS = [
  { href: "/cont", label: "Panoul meu" },
  { href: "/cont/licitatiile-mele", label: "Licitațiile mele" },
  { href: "/cont/comenzi", label: "Comenzi" },
  { href: "/cont/anunturi", label: "Anunțuri" },
  { href: "/cont/cauze", label: "Cauzele mele" },
  { href: "/cont/setari", label: "Setări" },
];

/**
 * Three bars of different lengths, which fold into a cross when the menu is
 * open: the top and bottom bars slide to the middle and rotate, the short one
 * in between fades out.
 */
function MenuToggle({ open }: { open: boolean }) {
  // 2px bars in a 20px box: the same weight and size as the lucide icons
  // beside it in the header, so the row reads as one set.
  const bar =
    "h-[2px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(0.2,0.9,0.3,1.1)]";

  // Bars sit 4px apart, which puts the outer two 6px either side of the middle
  // — exactly how far they travel to cross.
  return (
    <span
      aria-hidden="true"
      className="flex h-5 w-5 flex-col items-start justify-center gap-[4px]"
    >
      <span className={cn(bar, open ? "w-5 translate-y-[6px] rotate-45" : "w-5")} />
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
 * A header dropdown. Both panels stay mounted so they can animate out as well
 * as in — `visibility` is in the transition list on purpose, since it holds at
 * `visible` for the whole duration when going the other way, and it takes the
 * closed panel's links out of the tab order.
 */
function Panel({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 top-full origin-top bg-white px-4 pt-1 pb-4 shadow-sm transition-[opacity,translate,visibility] duration-[260ms] ease-[cubic-bezier(0.2,0.7,0.3,1)] sm:px-6 lg:hidden",
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
 * Header icon buttons. While their panel is open they hold the same tint they
 * take on hover — the state is worth marking, but a close button is not a
 * brand moment, so it stays in ink.
 */
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
    which: "nav" | "account" | "search" | null;
  }>({ path: pathname, which: null });

  const openPanel = panel.path === pathname ? panel.which : null;
  const close = () => setPanel({ path: pathname, which: null });
  const toggle = (which: "nav" | "account" | "search") =>
    setPanel((current) => ({
      path: pathname,
      which:
        current.path === pathname && current.which === which ? null : which,
    }));

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

  const search = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(
      trimmed ? `/licitatii?q=${encodeURIComponent(trimmed)}` : "/licitatii",
    );
    close();
  };

  const panelOpen = openPanel === "nav" || openPanel === "search";

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const searchField = (
    <div className="flex h-11 w-full items-center gap-2 rounded-xl bg-ink-100 px-3.5 transition focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500">
      <Icons.search
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-ink-500"
      />
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Caută cauze sau licitații"
        aria-label="Caută licitații"
        className="min-w-0 flex-1 bg-transparent text-[15px] text-ink-900 placeholder:text-ink-500 focus:outline-none"
      />
    </div>
  );

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
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
        <Logo size="sm" className="shrink-0 lg:hidden" />
        <Logo size="md" className="hidden shrink-0 lg:inline-flex" />
        <nav aria-label="Navigare principală" className="ml-3 hidden lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-xl px-3 py-2 font-display text-[15px] font-bold transition",
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
            className="ml-1 inline-flex items-center gap-1.5 rounded-xl px-3 py-2 font-display text-[15px] font-bold text-primary-700 transition hover:bg-primary-50"
          >
            <Icons.donation aria-hidden="true" className="h-4 w-4" />
            Strânge fonduri
          </Link>
        </nav>
        <form
          onSubmit={search}
          role="search"
          className="ml-auto hidden w-64 lg:block"
        >
          {searchField}
        </form>
        <div className="ml-auto flex items-center gap-1 lg:ml-3">
          <button
            type="button"
            onClick={() => toggle("search")}
            aria-label={
              openPanel === "search" ? "Închide căutarea" : "Caută"
            }
            aria-expanded={openPanel === "search"}
            className={cn(
              "lg:hidden",
              iconButton(openPanel === "search", "h-9 w-9"),
            )}
          >
            {openPanel === "search" ? (
              <Icons.close aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Icons.search aria-hidden="true" className="h-5 w-5" />
            )}
          </button>

          {status === "loading" ? (
            <Skeleton className="h-10 w-10 rounded-xl" />
          ) : user ? (
            <>
              <ButtonLink
                href="/cont/anunturi/nou"
                size="sm"
                className="hidden sm:inline-flex"
              >
                Listează
              </ButtonLink>
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => toggle("account")}
                  aria-expanded={openPanel === "account"}
                  aria-haspopup="menu"
                  aria-label="Contul meu"
                  className={iconButton(openPanel === "account")}
                >
                  <Avatar
                    name={user.displayName}
                    src={user.avatarUrl}
                    accountType={user.accountType}
                    size="sm"
                  />
                </button>

                {openPanel === "account" ? (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 animate-pop-in rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-line"
                  >
                    <p className="truncate px-2.5 pt-1.5 pb-2 font-display font-bold text-ink-900">
                      {user.displayName}
                    </p>

                    {ACCOUNT_LINKS.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        role="menuitem"
                        className="block rounded-xl px-2.5 py-2 text-[15px] font-semibold text-ink-700 transition hover:bg-ink-50 hover:text-ink-900"
                      >
                        {item.label}
                      </Link>
                    ))}

                    {isStaff ? (
                      <Link
                        href={isAdmin ? "/admin" : "/operator/cauze"}
                        role="menuitem"
                        className="block rounded-xl px-2.5 py-2 text-[15px] font-semibold text-sky-700 transition hover:bg-sky-50"
                      >
                        {isAdmin ? "Administrare" : "Zona operator"}
                      </Link>
                    ) : null}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={async () => {
                        await logout();
                        router.push("/");
                      }}
                      className="mt-1 block w-full rounded-xl border-t border-line px-2.5 pt-2.5 pb-2 text-left text-[15px] font-semibold text-ink-600 transition hover:text-ink-900"
                    >
                      Ieși din cont
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <ButtonLink href="/autentificare" size="sm">
              Intră în cont
            </ButtonLink>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-label="Închide"
        onClick={close}
        tabIndex={panelOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 top-14 -z-10 cursor-default bg-ink-900/20 transition-[opacity,visibility] duration-[260ms] sm:top-16 lg:hidden",
          panelOpen ? "visible opacity-100" : "invisible opacity-0",
        )}
      />

      <Panel open={openPanel === "search"}>
        <form onSubmit={search} role="search">
          {searchField}
        </form>
      </Panel>

      <Panel open={openPanel === "nav"}>
        <nav aria-label="Navigare" className="flex flex-col gap-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-xl px-3 py-2.5 font-display text-base font-bold transition",
                isActive(item.href)
                  ? "text-primary-700"
                  : "text-ink-800 hover:text-ink-900",
              )}
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="/cont/cauze/noua"
            className="group mt-2 flex items-center gap-3 rounded-2xl bg-primary-50 p-2.5 transition hover:bg-primary-100"
          >
            <span
              aria-hidden="true"
              /* The logo's mark, reused: a solid brand-green square with a
                 white glyph on it. Coral on green fought itself. */
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-500 text-white"
            >
              <Icons.donation className="h-5.5 w-5.5" />
            </span>
            <span className="flex min-w-0 flex-col leading-tight">
              <span className="font-display font-bold text-primary-900">
                Strânge fonduri
              </span>
              <span className="text-sm leading-tight text-primary-900/80">
                Pornește o cauză
              </span>
            </span>
            <Icons.forward
              aria-hidden="true"
              className="mr-1 ml-auto h-5 w-5 shrink-0 text-primary-700 transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          {user ? (
            <ButtonLink href="/cont/anunturi/nou" className="mt-2 sm:hidden">
              Listează un produs
            </ButtonLink>
          ) : null}
        </nav>
      </Panel>
    </header>
  );
}
