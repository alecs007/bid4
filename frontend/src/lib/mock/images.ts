import type { CauseCategoryId, AuctionCategoryId } from "@/lib/config";

/**
 * Imagery for the seeded world. Still no network and no image hosts: the
 * photographs are files in `public`, and everything else is an SVG data URI
 * built from its seed, so the same listing always looks the same.
 *
 * TODO(backend): once uploads exist these are only the fallback for a missing
 * image; the call sites already read the field, not the helper.
 */

/** Stable 32-bit hash so a seed always maps to the same colours. */
function hash(seed: string): number {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

/** Warm, on-brand duotones. Deliberately desaturated so cards stay calm. */
const PALETTES: [string, string][] = [
  ["#e3f8cf", "#a6e772"], // primary
  ["#ffe1d8", "#ffc3b2"], // accent
  ["#d9f0fd", "#b3e2fb"], // sky
  ["#fff3c6", "#ffe587"], // sun
  ["#eceae5", "#ded9d1"], // neutral
  ["#f3fcea", "#c8f1a4"],
];

function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    svg.replace(/\s{2,}/g, " ").trim(),
  )}`;
}

interface TileOptions {
  seed: string;
  glyph: string;
  width?: number;
  height?: number;
  /** Small caption printed under the glyph, e.g. the category label. */
  caption?: string;
}

function tile({
  seed,
  glyph,
  width = 800,
  height = 600,
  caption,
}: TileOptions): string {
  const seedHash = hash(seed);
  const [light, deep] = PALETTES[seedHash % PALETTES.length] ?? PALETTES[0]!;
  const angle = seedHash % 90;
  const dotOpacity = 0.35;
  const glyphSize = Math.min(width, height) * 0.34;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img">
      <defs>
        <linearGradient id="g" gradientTransform="rotate(${angle})">
          <stop offset="0%" stop-color="${light}"/>
          <stop offset="100%" stop-color="${deep}"/>
        </linearGradient>
        <pattern id="p" width="48" height="48" patternUnits="userSpaceOnUse">
          <circle cx="12" cy="12" r="3" fill="#ffffff" opacity="${dotOpacity}"/>
        </pattern>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#g)"/>
      <rect width="${width}" height="${height}" fill="url(#p)"/>
      <text x="50%" y="${caption ? "46%" : "50%"}" font-size="${glyphSize}"
            text-anchor="middle" dominant-baseline="central">${glyph}</text>
      ${
        caption
          ? `<text x="50%" y="72%" font-size="${Math.round(
              glyphSize * 0.19,
            )}" fill="#1f2a24" opacity="0.55" text-anchor="middle"
               font-family="Nunito, system-ui, sans-serif" font-weight="700">${caption}</text>`
          : ""
      }
    </svg>`;

  return svgToDataUri(svg);
}

/**
 * Glyphs for the stand-in photography, and only for that.
 *
 * <p>They used to be read off the category config, which is the only reason the
 * config carried an emoji at all. Categories and causes are drawn with the
 * illustrations under `/images/illustrations` now, so the config has no use for
 * them — but a seeded auction still needs a cover, and a grid of identical
 * gradients tells you nothing about what you are looking at. Kept here, beside
 * the fake data they belong to, and gone with it once uploads land.
 */
const CATEGORY_GLYPHS: Record<AuctionCategoryId, string> = {
  moda: "\u{1F457}",
  electronice: "\u{1F4F1}",
  casa: "\u{1F3E1}",
  arta: "\u{1F3A8}",
  carti: "\u{1F4D6}",
  sport: "⚽",
  jucarii: "\u{1F9E9}",
  colectii: "\u{1F3C6}",
  bijuterii: "\u{1F48D}",
};

const CAUSE_GLYPHS: Record<CauseCategoryId, string> = {
  medical: "\u{1FA7A}",
  educatie: "\u{1F4DA}",
  copii: "\u{1F9F8}",
  animale: "\u{1F43E}",
  mediu: "\u{1F331}",
  varstnici: "\u{1F475}",
  comunitate: "\u{1F3D8}️",
  urgente: "\u{1F6A8}",
};

export function auctionImage(
  seed: string,
  category: AuctionCategoryId,
  index = 0,
): string {
  return tile({
    seed: `${seed}-${index}`,
    glyph: CATEGORY_GLYPHS[category] ?? "\u{1F4E6}",
  });
}

/**
 * Listings whose cover is a real photograph under `public/images/products`.
 *
 * <p>Listed rather than derived, because nothing can check the filesystem from
 * the browser: a key missing from here falls back to a generated tile instead of
 * rendering a broken image.
 */
const PHOTOGRAPHED = new Set([
  "anulata",
  "bicicleta",
  "canon",
  "carti",
  "ceas",
  "chitara",
  "cort",
  "draft-telefon",
  "espressor",
  "ghiozdan",
  "ilustratie",
  "lego",
  "masina-cusut",
  "nevanduta",
  "nevanduta-2",
  "review-consola",
  "rochie",
  "sold-anulat",
  "sold-confirmare",
  "sold-disputa",
  "sold-disputa-rezolvata",
  "sold-escrow",
  "sold-esuata",
  "sold-eticheta",
  "sold-finalizat",
  "sold-livrat",
  "sold-locker",
  "sold-plata",
  "sold-predat",
  "sold-rambursat",
  "sold-tranzit",
  "tablou",
  "tricou-retro",
  "vinil",
]);

/**
 * A small gallery for one auction.
 *
 * <p>The first frame is a photograph of the thing itself, because that is the
 * one a card shows and the one a buyer judges. A grid of tinted gradients told
 * you the seed data was seed data at a glance, and nothing about how the page
 * behaves once real sellers upload real pictures. The rest of the gallery stays
 * generated: what is being tested past the first frame is the carousel, not the
 * photography.
 */
export function auctionGallery(
  seed: string,
  category: AuctionCategoryId,
  count = 3,
): string[] {
  const rest = Array.from({ length: count - 1 }, (_, index) =>
    auctionImage(seed, category, index + 1),
  );
  return PHOTOGRAPHED.has(seed)
    ? [`/images/products/${seed}.webp`, ...rest]
    : [auctionImage(seed, category, 0), ...rest];
}

/**
 * Causes with a photograph of their own, keyed by slug.
 *
 * <p>Only the seeded ones. A cause somebody creates in the wizard has no file
 * waiting for it, and falls back to a generated tile until its organiser
 * uploads a cover.
 */
const CAUSE_PHOTOS = new Set([
  "adapostul-labute-fericite",
  "ambulanta-pentru-delta",
  "aparat-rmn-spitalul-judetean",
  "biblioteca-pentru-satul-vladeni",
  "casa-comunitara-ferentari",
  "cursuri-programare-liceeni",
  "ghiozdane-pline-de-speranta",
  "impreuna-pentru-ana",
  "o-masa-calda-pentru-bunici",
  "padurea-de-maine",
  "renovare-camin-de-batrani",
  "sprijin-familii-monoparentale",
  "sterilizari-gratuite-in-cluj",
  "tabere-de-vara-pentru-copii",
  "terapie-pentru-copiii-cu-autism",
]);

/** The cause's own picture: on its card, and beside it on a listing. */
export function causeImage(seed: string, category: CauseCategoryId): string {
  if (CAUSE_PHOTOS.has(seed)) return `/images/causes/${seed}.webp`;
  return tile({
    seed,
    glyph: CAUSE_GLYPHS[category] ?? "\u{1F49A}",
    width: 800,
    height: 600,
  });
}

/** A handful of pictures of the cause at work. */
export function causeGallery(
  seed: string,
  category: CauseCategoryId,
  count = 4,
): string[] {
  return Array.from({ length: count }, (_, index) =>
    tile({
      seed: `${seed}-photo-${index}`,
      glyph: CAUSE_GLYPHS[category] ?? "\u{1F49A}",
      width: 900,
      height: 675,
    }),
  );
}

/** The banner at the top of a cause. Same photograph, cropped wide by CSS. */
export function causeCover(seed: string, category: CauseCategoryId): string {
  if (CAUSE_PHOTOS.has(seed)) return `/images/causes/${seed}.webp`;
  return tile({
    seed: `${seed}-cover`,
    glyph: CAUSE_GLYPHS[category] ?? "\u{1F49A}",
    width: 1600,
    height: 600,
  });
}

/** Initials on a duotone disc — no faces, no fake people. */
export function avatarImage(seed: string, name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const seedHash = hash(seed);
  const [light, deep] = PALETTES[seedHash % PALETTES.length] ?? PALETTES[0]!;

  return svgToDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="a" gradientTransform="rotate(${seedHash % 90})">
          <stop offset="0%" stop-color="${light}"/>
          <stop offset="100%" stop-color="${deep}"/>
        </linearGradient>
      </defs>
      <rect width="160" height="160" fill="url(#a)"/>
      <text x="50%" y="52%" font-size="64" fill="#1f2a24" opacity="0.7"
            text-anchor="middle" dominant-baseline="central"
            font-family="Nunito, system-ui, sans-serif" font-weight="800">${initials}</text>
    </svg>`);
}
