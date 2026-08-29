import Link from "next/link";

import { Icons } from "@/components/icons";
import { Logo, Mascot } from "@/components/ui";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Platformă",
    links: [
      { href: "/licitatii", label: "Licitații în desfășurare" },
      { href: "/cauze", label: "Cauze verificate" },
      { href: "/cum-functioneaza", label: "Cum funcționează" },
    ],
  },
  {
    title: "Contul tău",
    links: [
      { href: "/cont", label: "Panoul meu" },
      { href: "/cont/vanzari/nou", label: "Vinde acum" },
      { href: "/cont/cauze/noua", label: "Deschide o cauză" },
      { href: "/cont/comenzi", label: "Comenzile mele" },
    ],
  },
  {
    title: "Ajutor",
    links: [
      { href: "/cum-functioneaza", label: "Întrebări frecvente" },
      { href: "/cum-functioneaza#livrare", label: "Livrare și Easybox" },
      { href: "/cum-functioneaza#escrow", label: "Cum sunt protejate plățile" },
      { href: "/cum-functioneaza#comisioane", label: "Comisioane" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo size="md" href={null} />
            <p className="mt-3 max-w-sm text-ink-600">
              Licitezi pentru lucruri care îți plac, iar o parte din preț susține o
              cauză verificată. Transparent de la prima ofertă, cu plata
              protejată până când coletul ajunge la tine.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <Mascot mood="happy" size={52} />
              <p className="text-sm font-bold text-ink-700">
                Fiecare ofertă lasă ceva bun în urmă.
              </p>
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h2 className="font-display text-sm font-extrabold text-ink-900">
                  {column.title}
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="text-sm text-ink-600 transition hover:text-primary-700"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-500">
            © {new Date().getFullYear()} bid4. Toate drepturile rezervate.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-500">
            <span className="inline-flex items-center gap-1.5">
              <Icons.escrow aria-hidden="true" className="h-4 w-4 shrink-0" />
              Plăți protejate
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icons.delivery aria-hidden="true" className="h-4 w-4 shrink-0" />
              Livrare prin Sameday Easybox
            </span>
            <Link href="/design-system" className="transition hover:text-ink-800">
              Design system
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
