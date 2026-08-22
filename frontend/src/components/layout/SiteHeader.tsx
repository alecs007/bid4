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
    // `site-header` is anchored in globals.css: during a page transition the
    // header holds still while the content slides under it.
    <header className="sticky top-0 z-40 bg-white [view-transition-name:site-header]">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-2 px-4 sm:h-16 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => toggle("nav")}
          aria-label={openPanel === "nav" ? "Închide meniul" : "Meniu"}
          aria-expanded={openPanel === "nav"}
          className="-ml-2 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100 hover:text-ink-900 lg:hidden"
        >
          {openPanel === "nav" ? (
            <Icons.close aria-hidden="true" className="h-5 w-5" />
          ) : (
            <Icons.menu aria-hidden="true" className="h-5 w-5" />
          )}
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
            aria-label="Caută"
            aria-expanded={openPanel === "search"}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-700 transition hover:bg-ink-100 hover:text-ink-900 lg:hidden"
          >
            <Icons.search aria-hidden="true" className="h-5 w-5" />
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
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-ink-100"
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

      {openPanel === "search" || openPanel === "nav" ? (
        <>
          <button
            type="button"
            aria-label="Închide"
            onClick={close}
            className="fixed inset-0 top-14 -z-10 cursor-default bg-ink-900/20 sm:top-16 lg:hidden"
          />
          <div className="absolute inset-x-0 top-full origin-top animate-panel-in bg-white px-4 pt-1 pb-4 shadow-sm sm:px-6 lg:hidden">
            {openPanel === "search" ? (
              <form onSubmit={search} role="search">
                {searchField}
              </form>
            ) : (
              <nav aria-label="Navigare" className="flex flex-col gap-0.5">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-xl px-3 py-2.5 font-display text-base font-bold transition",
                      isActive(item.href)
                        ? "bg-primary-50 text-primary-800"
                        : "text-ink-800 hover:bg-ink-50",
                    )}
                  >
                    {item.label}
                  </Link>
                ))}

                <Link
                  href="/cont/cauze/noua"
                  className="mt-2 flex items-center gap-3 rounded-2xl bg-primary-50 px-3 py-3"
                >
                  <Icons.donation
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 text-primary-700"
                  />
                  <span className="min-w-0 flex flex-col">
                    <span className="font-display font-bold text-primary-900">
                      Strânge fonduri
                    </span>
                    <span className="text-sm text-primary-900/80">
                      Deschide o cauză
                    </span>
                  </span>
                </Link>

                {user ? (
                  <ButtonLink
                    href="/cont/anunturi/nou"
                    className="mt-2 sm:hidden"
                  >
                    Listează un produs
                  </ButtonLink>
                ) : null}
              </nav>
            )}
          </div>
        </>
      ) : null}
    </header>
  );
}
