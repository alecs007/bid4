import Image from "next/image";

const BANNER = {
  src: "/images/hero/banner-1.webp",
  mobile: "/images/hero/banner-1-mobile.webp",
  alt: "Cumperi sau vinzi, faci un bine. Cauze verificate și o donație la fiecare licitație.",
};

export function HeroBanner() {
  return (
    <section className="bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 pt-4 pb-6 sm:px-6 sm:pt-6 lg:px-8">
        <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-primary-500/15 sm:aspect-[4/1] sm:rounded-3xl">
          <Image
            src={BANNER.src}
            alt={BANNER.alt}
            fill
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
