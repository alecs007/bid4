import type { CauseCategoryId, ProductCategoryId } from "@/lib/config";
import { CAUSE_CATEGORIES, PRODUCT_CATEGORIES } from "@/lib/config";

/**
 * Branded placeholder imagery, generated as SVG data URIs.
 *
 * No network, no next.config image hosts, no offline breakage, and — unlike
 * random stock photos — a placeholder can never contradict its listing. Every
 * image is deterministic in its seed, so the same auction always looks the same.
 *
 * TODO(backend): once uploads exist, `imageUrl` / `images[]` carry real object
 * storage URLs and these helpers are only used as the fallback for a missing
 * image. The call sites already read the field, not the helper.
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

/* -------------------------------------------------------------------------- */

const PRODUCT_GLYPHS = new Map(
  PRODUCT_CATEGORIES.map((category) => [category.id, category.emoji]),
);
const CAUSE_GLYPHS = new Map(
  CAUSE_CATEGORIES.map((category) => [category.id, category.emoji]),
);

export function productImage(
  seed: string,
  category: ProductCategoryId,
  index = 0,
): string {
  return tile({
    seed: `${seed}-${index}`,
    glyph: PRODUCT_GLYPHS.get(category) ?? "📦",
  });
}

/** A small gallery for one product; each frame gets its own colourway. */
export function productGallery(
  seed: string,
  category: ProductCategoryId,
  count = 3,
): string[] {
  return Array.from({ length: count }, (_, index) =>
    productImage(seed, category, index),
  );
}

export function causeImage(seed: string, category: CauseCategoryId): string {
  return tile({
    seed,
    glyph: CAUSE_GLYPHS.get(category) ?? "💚",
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
      glyph: CAUSE_GLYPHS.get(category) ?? "💚",
      width: 900,
      height: 675,
    }),
  );
}

export function causeCover(seed: string, category: CauseCategoryId): string {
  return tile({
    seed: `${seed}-cover`,
    glyph: CAUSE_GLYPHS.get(category) ?? "💚",
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
