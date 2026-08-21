import { ButtonLink, Card, Logo, Mascot } from "@/components/ui";

/**
 * Placeholder home page.
 * TODO: replaced by the real homepage (hero, featured auctions, ending soon,
 * trending causes, impact stats) in the public-pages phase.
 */
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <Logo size="lg" href={null} />
      <Mascot mood="cheer" size={140} floating />
      <div>
        <h1 className="font-display text-4xl font-extrabold text-ink-900 sm:text-5xl">
          Licitezi. Câștigi. Ajuți.
        </h1>
        <p className="mt-3 text-lg text-ink-600">
          Platforma de licitații în care fiecare ofertă devine ajutor real.
          Frontendul este în construcție, iar fundația vizuală este gata.
        </p>
      </div>
      <Card className="w-full">
        <p className="font-display text-lg font-extrabold text-ink-900">
          Pasul 1 și 2 sunt gata
        </p>
        <p className="mt-1 text-ink-600">
          Tokenuri de design, fonturi, iconițe și sistemul de componente.
        </p>
        <div className="mt-4 flex justify-center">
          <ButtonLink href="/design-system" size="lg">
            Vezi design system-ul
          </ButtonLink>
        </div>
      </Card>
    </main>
  );
}
