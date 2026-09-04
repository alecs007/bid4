import Image from "next/image";

import { ButtonLink } from "@/components/ui";

import { ImpactLine } from "./HomeSections";

/**
 * The homepage's first screen as it was written: the promise, the two ways in, and the mascot.
 *
 * <p>Not rendered at the moment — the page opens on `HeroSlider` instead. Kept whole rather than
 * deleted because it is the only place the site says what it is for in its own words, and putting
 * it back is a matter of swapping which one the page imports.
 */
export function HeroIntro() {
  return (
    <section className="bg-white">
      <div className="mx-auto grid w-full max-w-7xl gap-5 px-4 pb-8 sm:px-6 sm:pt-8 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:px-8 lg:pt-6 lg:pb-16">
        <div>
          <h1 className="font-display text-[2.1rem] leading-[1.05] font-extrabold text-ink-900 sm:text-5xl lg:text-6xl">
            Cumperi sau vinzi,
            <br />
            <span className="text-primary-600">faci un bine.</span>
          </h1>
          <p className="mt-3 max-w-lg text-ink-600 sm:mt-4 sm:text-lg">
            Lucrurile nefolosite pot face mai mult decât să ocupe spațiu. Dă-le
            o nouă valoare și susține o cauză care are nevoie
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
              className="flex-1 whitespace-nowrap sm:flex-none"
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
            src="/images/bid4-mascot-illustration.webp"
            alt="Mascota bid4 ține o cutie cu donații, lângă haine și lucruri pregătite de trimis."
            fill
            loading="eager"
            fetchPriority="high"
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-contain"
            draggable={false}
          />
        </div>
      </div>
    </section>
  );
}
