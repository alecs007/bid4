import Image from "next/image";

/**
 * What the banner says, in the two shapes it was drawn in.
 *
 * <p>`alt` is what a reader who cannot see it is told it says. The phone file is the same banner
 * composed for the taller crop rather than the same picture at another size, which is why there are
 * two of them and not one source set.
 */
const BANNER = {
  src: "/images/hero/banner-1.webp",
  mobile: "/images/hero/banner-1-mobile.webp",
  alt: "Cumperi sau vinzi, faci un bine. Cauze verificate și o donație la fiecare licitație.",
};

/**
 * The banner the homepage opens on.
 *
 * <p>One banner, shown plainly. There is only the one drawn so far, and a slider carrying a single
 * panel is a set of controls that lead back to where they started: arrows that change nothing and a
 * countdown that counts to itself. `HeroSlider` is what this becomes again once there is a second
 * banner to turn to — it is kept whole beside this file, and putting it back is a matter of
 * swapping which one the page imports.
 *
 * <p>Nothing here runs in the browser, so the page's first screen costs no JavaScript at all.
 */
export function HeroBanner() {
  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-6 sm:px-6 sm:pt-6 lg:px-8">
        {/* 2:1 on a phone and 4:1 from `sm`: a quarter of 375px is a strip too
            shallow to read, and the height only pays for itself because the
            banner is composed for it. */}
        <div className="relative aspect-[2/1] w-full overflow-hidden rounded-2xl bg-ink-100 sm:aspect-[4/1] sm:rounded-3xl">
          <Image
            src={BANNER.src}
            alt={BANNER.alt}
            fill
            // Already sized and encoded for this slot, so it is served as made
            // rather than re-compressed on top at q75.
            unoptimized
            sizes="(min-width: 1280px) 1216px, 100vw"
            priority
            className="hidden object-cover sm:block"
          />
          <Image
            src={BANNER.mobile}
            alt={BANNER.alt}
            fill
            unoptimized
            sizes="100vw"
            priority
            className="object-cover sm:hidden"
          />
        </div>
      </div>
    </section>
  );
}
