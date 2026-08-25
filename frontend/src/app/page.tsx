import Image from "next/image";

import { Icons } from "@/components/icons";
import { ButtonLink, IconBubble, Mascot } from "@/components/ui";
import { PRODUCT_CATEGORIES } from "@/lib/config";
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
    icon: Icons.auction,
    title: "Licitezi",
    body: "Fiecare anunț arată din prima cât din preț ajunge la cauză.",
  },
  {
    icon: Icons.escrow,
    title: "Plătești protejat",
    body: "Plata rămâne la bid4 până confirmi că ai primit coletul.",
  },
  {
    icon: Icons.donation,
    title: "Ajutorul ajunge",
    body: "Donația pleacă spre cauză, iar vânzătorul își primește partea.",
  },
];

export default function HomePage() {
  return (
    <PageTransition>
      <main className="flex flex-col">
        <section className="bg-white">
          <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 pt-4 pb-8 sm:px-6 sm:pt-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-8 lg:pt-14 lg:pb-16">
            <div>
              <h1 className="font-display text-[2.1rem] leading-[1.05] font-extrabold text-ink-900 sm:text-5xl lg:text-6xl">
                Schimbă destine
                <br />
                prin <span className="text-primary-600">licitații.</span>
              </h1>
              <p className="mt-3 max-w-lg text-ink-600 sm:mt-4 sm:text-lg">
                Cumperi sau vinzi, o parte din bani vor ajunge la cauze care au
                nevoie de sprijin. Fiecare licitație e o șansă în plus pentru
                cineva care are nevoie.
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
            <div className="relative order-first aspect-video w-full lg:order-none">
              <Image
                src="/images/hero-mascot.avif"
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
          <CategoryRow categories={PRODUCT_CATEGORIES} />
          <PopularRow />
          <TrendingCauses />
          <section
            aria-labelledby="start-cause"
            className="overflow-hidden rounded-3xl bg-white ring-1 ring-edge"
          >
            <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
              <Mascot mood="happy" size={104} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <h2
                  id="start-cause"
                  className="font-display text-xl font-extrabold text-ink-900 sm:text-2xl"
                >
                  Ai o cauză care are nevoie de sprijin?
                </h2>
                <p className="mt-1.5 text-ink-600">
                  Un tratament, un adăpost de animale, o școală fără bibliotecă
                  sau o comunitate lovită de calamitate. Deschizi cauza, o
                  verificăm în 48 de ore, apoi oricine poate licita în sprijinul
                  ei.
                </p>
                <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
                  <ButtonLink href="/cont/cauze/noua" size="lg">
                    Deschide o cauză
                  </ButtonLink>
                  <ButtonLink
                    href="/cum-functioneaza#cauze"
                    variant="secondary"
                    size="lg"
                  >
                    Vezi cum verificăm
                  </ButtonLink>
                </div>
              </div>
            </div>
          </section>
          <section aria-labelledby="how">
            <h2
              id="how"
              className="mb-4 font-display text-xl font-extrabold text-ink-900 sm:text-2xl"
            >
              Cum funcționează
            </h2>
            <ol className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {STEPS.map((step) => (
                <li
                  key={step.title}
                  className="rounded-3xl bg-white ring-1 ring-edge p-5"
                >
                  <IconBubble tone="primary" size="md">
                    <step.icon aria-hidden="true" className="h-5 w-5" />
                  </IconBubble>
                  <h3 className="mt-3 font-display text-lg font-extrabold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-ink-600">{step.body}</p>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-3xl bg-white ring-1 ring-edge px-5 py-10 text-center sm:px-12">
            <Mascot mood="happy" size={80} className="mx-auto" />
            <h2 className="mt-3 font-display text-xl font-extrabold text-ink-900 sm:text-2xl">
              Ai lucruri care merită o a doua viață?
            </h2>
            <p className="mx-auto mt-1.5 max-w-md text-ink-600">
              Alegi cauza și procentul donat. De plată, livrare și transferul
              banilor ne ocupăm noi.
            </p>
            <div className="mt-5 flex justify-center">
              <ButtonLink href="/cont/anunturi/nou" size="lg">
                Vinde acum
              </ButtonLink>
            </div>
          </section>
        </div>
      </main>
    </PageTransition>
  );
}
