import Image from "next/image";

import { ButtonLink, Mascot } from "@/components/ui";
import { AUCTION_CATEGORIES } from "@/lib/config";
import {
  CategoryRow,
  EndingSoonRow,
  ImpactLine,
  PopularRow,
  TrendingCauses,
} from "./_components/HomeSections";
import { PageTransition } from "@/components/layout/PageTransition";

const STEPS = [
  {
    image: "/images/illustrations/bid.svg",
    title: "1. Alegi produsul dorit",
    body: "Ai găsit ceva ce-ți place? Plasează o ofertă. Tu decizi suma maximă pe care ești dispus să o plătești pentru produsul ales.",
  },
  {
    image: "/images/illustrations/escrow.svg",
    title: "2. Plătești în siguranță",
    body: "Oferta ta a fost câștigătoare? Plătește online fără nicio grijă. Noi păstrăm banii în siguranță până când coletul ajunge la tine.",
  },
  {
    image: "/images/illustrations/donation.svg",
    title: "3. Finalizezi cu o faptă bună",
    body: "Coletul a ajuns la tine? Confirmă că totul este ok. Din banii pe care i-ai plătit deja, o parte devin donație pentru o cauză verificată.",
  },
];

export default function HomePage() {
  return (
    <PageTransition>
      <main className="flex flex-col">
        <section className="bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-8 sm:px-6 sm:pt-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-8 lg:pt-6 lg:pb-16">
            <div>
              <h1 className="font-display text-[2.1rem] leading-[1.05] font-extrabold text-ink-900 sm:text-5xl lg:text-6xl">
                Investește în bine
                <br />
                prin <span className="text-primary-600">licitații.</span>
              </h1>
              <p className="mt-3 max-w-lg text-ink-600 sm:mt-4 sm:text-lg">
                Lucrurile nefolosite pot face mai mult decât să ocupe spațiu.
                Dă-le o nouă valoare și susține o cauză care are nevoie
                <span className="ml-0.5">!</span>
              </p>
              <div className="mt-5 flex gap-2.5">
                <ButtonLink href="/cauze" size="lg">
                  Descoperă cauzele
                </ButtonLink>
                <ButtonLink
                  href="/licitatii"
                  variant="secondary"
                  size="lg"
                  className="flex-1 sm:flex-none whitespace-nowrap"
                >
                  Vezi licitațiile
                </ButtonLink>
              </div>
              <div className="mt-6">
                <ImpactLine />
              </div>
            </div>
            <div className="relative order-first aspect-[3/2] w-full lg:order-none">
              <Image
                src="/images/hero-mascot-illustration.avif"
                alt="Mascota bid4 ține o cutie cu donații, lângă haine și lucruri pregătite de trimis."
                fill
                priority
                sizes="(min-width: 1024px) 560px, 100vw"
                className="object-contain"
              />
            </div>
          </div>
        </section>
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-10 sm:px-6 lg:gap-14 lg:px-8 lg:py-14">
          <EndingSoonRow />
          <CategoryRow categories={AUCTION_CATEGORIES} />{" "}
          <section
            aria-labelledby="how"
            className="rounded-3xl bg-white ring-1 ring-edge p-8 sm:p-10"
          >
            <h2
              id="how"
              className="mb-8 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl text-center sm:text-left"
            >
              Cum funcționează?
            </h2>
            <ol className="grid gap-6 sm:grid-cols-3">
              {STEPS.map((step) => (
                <li
                  key={step.title}
                  className="flex flex-col rounded-2xl bg-gray-50/50 px-5 py-6 ring-1 ring-edge sm:p-8"
                >
                  <div className="relative mb-6 h-32 w-full shrink-0 sm:h-40 lg:h-42">
                    <Image
                      src={step.image}
                      alt={step.title}
                      fill
                      className="object-contain object-center sm:object-left"
                    />
                  </div>

                  <h3 className="font-display text-xl font-extrabold text-ink-900 text-center sm:text-2xl sm:text-left">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-ink-600 leading-relaxed text-center sm:text-left">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </section>
          <TrendingCauses />
          <section
            aria-labelledby="start-cause"
            className="overflow-hidden rounded-3xl bg-white ring-1 ring-edge"
          >
            <div className="flex flex-col gap-5 p-8 sm:flex-row items-center text-center sm:text-left sm:gap-10 sm:p-10">
              <Mascot mood="love" size={156} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <h2
                  id="start-cause"
                  className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl"
                >
                  Știi o cauză care are nevoie de sprijin?
                </h2>
                <p className="mt-1.5 text-ink-600 sm:text-lg">
                  Un tratament medical, o problemă socială, un proiect caritabil
                  sau o situație de urgență. Trimite-ne detaliile, validăm cazul
                  în 48 de ore și dăm startul licitațiilor caritabile.
                </p>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                  <ButtonLink href="/cont/cauze/noua" size="lg">
                    Strânge fonduri prin bid4
                  </ButtonLink>
                  <ButtonLink
                    href="/cum-functioneaza#cauze"
                    variant="secondary"
                    size="lg"
                  >
                    Află cum verificăm
                  </ButtonLink>
                </div>
              </div>
            </div>
          </section>{" "}
          <PopularRow />
          <section className="rounded-3xl bg-white ring-1 ring-edge px-5 py-10 text-center sm:px-12">
            <Mascot mood="idea" size={156} className="mx-auto" />
            <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">
              Ce-ar fi să ajuți cu ce nu folosești?
            </h2>
            <p className="mx-auto mt-1.5 max-w-xl text-ink-600">
              Să vinzi pe bid4 este cea mai simplă metodă de a face ordine în
              casă și de a ajuta o cauză în același timp.
            </p>
            <div className="mt-5 flex justify-center">
              <ButtonLink href="/cont/anunturi/nou" size="lg">
                Începe să vinzi pe bid4
              </ButtonLink>
            </div>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
