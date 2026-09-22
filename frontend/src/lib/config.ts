// TODO(backend): replace the literals with a cached GET /config/platform.
export type Bani = number;

export const LEU: Bani = 100;

export const USE_MOCK: boolean = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SHOW_DEV_TOOLS: boolean =
  process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS !== "false" &&
  (USE_MOCK || process.env.NODE_ENV !== "production");

export const FEES = {
  BUYER_TAX_PERCENT: 5,
  BUYER_TAX_FIXED: 2.5 * LEU,
} as const;

export const SHIPPING_PRICES = {
  EASYBOX: 1499 as Bani,
  HOME_COURIER: 2299 as Bani,
} as const;

export const ACCOUNT = {
  MIN_PASSWORD_LENGTH: 8,
  MIN_DISPLAY_NAME_LENGTH: 2,
  MAX_DISPLAY_NAME_LENGTH: 60,
} as const;

export const CAUSE = {
  // TODO(backend): enforced server-side when escrow is released, not here.
  UNVERIFIED_CAP: 5_000 * LEU,
  MIN_GOAL: 500 * LEU,
  MAX_GOAL: 500_000 * LEU,
  MIN_DOCUMENTS: 1,
  MAX_DOCUMENTS: 12,
  MAX_GALLERY_IMAGES: 6,
  MAX_UPLOAD_MB: 8,
  SHORT_DESCRIPTION_MAX: 160,
  STORY_MIN: 200,
  STORY_MAX: 4_000,
  REVIEW_HOURS: 48,
  MIN_BENEFICIARY_AGE: 0,
  MAX_MINOR_AGE: 17,
} as const;

export const IMAGE = {
  ACCEPTED_TYPES: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ] as readonly string[],
  MAX_INPUT_MB: 12,
  MAX_INPUT_BYTES: 12 * 1024 * 1024,
  MAX_EDGE_PX: 1600,
  QUALITY: 0.82,
  MAX_PIXELS: 40_000_000,
  MAX_UPLOAD_BYTES: 8 * 1024 * 1024,

  DEMO_MAX_EDGE_PX: 1200,
  DEMO_QUALITY: 0.72,
  DEMO_BUDGET_BYTES: 1_500_000,
} as const;

export const AUCTION = {
  MIN_STARTING_PRICE: 1 * LEU,
  MAX_STARTING_PRICE: 100_000 * LEU,

  BID_STEP_LADDER: [
    [10 * LEU, LEU / 2],
    [50 * LEU, 2.5 * LEU],
    [100 * LEU, 5 * LEU],
    [500 * LEU, 10 * LEU],
    [1_000 * LEU, 25 * LEU],
    [5_000 * LEU, 50 * LEU],
    [10_000 * LEU, 100 * LEU],
  ] as const,
  BID_STEP_ABOVE_LADDER: 250 * LEU,

  DISPATCH_DAYS: 7,

  PARCEL_TYPES: [
    {
      id: "small",
      label: "Colet mic",
      examples: "Cât un plic",
      weightGrams: 1_000,
      illustration: "parcels/small" as string | null,
      illustrationScale: 1,
    },
    {
      id: "medium",
      label: "Colet mediu",
      examples: "Cât o cutie de pantofi",
      weightGrams: 5_000,
      illustration: "parcels/medium" as string | null,
      illustrationScale: 1.06,
    },
    {
      id: "large",
      label: "Colet mare",
      examples: "Cât un bagaj de mână",
      weightGrams: 15_000,
      illustration: "parcels/large" as string | null,
      illustrationScale: 1,
    },
  ],

  MIN_IMAGES: 1,
  MAX_IMAGES: 8,
  MAX_TITLE_LENGTH: 120,
  MIN_TITLE_LENGTH: 8,
  MAX_DESCRIPTION_LENGTH: 4000,
  MIN_DESCRIPTION_LENGTH: 20,
  MIN_WEIGHT_GRAMS: 1,
  MAX_WEIGHT_GRAMS: 15_000,

  HOT_BID_THRESHOLD: 8,
} as const;

export function bidStepFor(startingPrice: Bani): Bani {
  for (const [bound, step] of AUCTION.BID_STEP_LADDER) {
    if (startingPrice <= bound) return step;
  }
  return AUCTION.BID_STEP_ABOVE_LADDER;
}

export const DONATION = {
  MIN_PERCENT: 5,
  MAX_PERCENT: 100,
  PRESET_PERCENTS: [10, 25, 50, 75, 100] as const,
  DEFAULT_PERCENT: 25,
  HERO_PERCENT: 75,
} as const;

export const TERMS = {
  VERSION: "2026-09-12",
} as const;

export const ORDER = {
  CONFIRMATION_HOURS: 72,
  AUTO_RELEASE_HOURS: 72,
  DROP_OFF_DAYS: 3,
  DISPUTE_WINDOW_HOURS: 72,
  PAYMENT_RETRY_ATTEMPTS: 3,
} as const;

export const SHIPPING = {
  COURIER_NAME: "Sameday",
  DELIVERY_DAYS_MIN: 1,
  DELIVERY_DAYS_MAX: 2,
  SERVICE_NAME: "Sameday Easybox",
  AWB_PREFIX: "2SD",
  TRACKING_URL_BASE: "https://sameday.ro/track",
  DEFAULT_WEIGHT_GRAMS: 500,
  MAX_WEIGHT_GRAMS: 15_000,
} as const;

export const MOCK = {
  MIN_LATENCY_MS: 220,
  MAX_LATENCY_MS: 700,
  READ_FAILURE_RATE: 0,
  PAYMENT_FAILURE_RATE: 0.12,

  AUTO_PAYMENT_DELAY_SECONDS: 8,
  AUTO_LABEL_DELAY_SECONDS: 6,
  COURIER_STEP_SECONDS: 40,
  SIMULATION_WINDOW_SECONDS: 1800,
  STORAGE_KEY: "bid4.world",
  SCHEMA_VERSION: 15,
  MAX_WORLD_AGE_HOURS: 8,
} as const;

export const CAUSE_CATEGORIES = [
  { id: "medical", label: "Sănătate" },
  { id: "educatie", label: "Educație" },
  { id: "copii", label: "Copii" },
  { id: "animale", label: "Animale" },
  { id: "mediu", label: "Mediu" },
  { id: "varstnici", label: "Vârstnici" },
  { id: "comunitate", label: "Comunitate" },
  { id: "urgente", label: "Urgențe" },
] as const;

export const AUCTION_CATEGORIES = [
  { id: "moda", label: "Fashion" },
  { id: "electronice", label: "Electronice" },
  { id: "casa", label: "Casă & Decor" },
  { id: "arta", label: "Artă & Handmade" },
  { id: "carti", label: "Cărți & Media" },
  { id: "sport", label: "Sport & Outdoor" },
  { id: "jucarii", label: "Jucării" },
  { id: "colectii", label: "Colecții" },
  { id: "bijuterii", label: "Bijuterii" },
] as const;

export const ROMANIAN_COUNTIES = [
  "Alba",
  "Arad",
  "Argeș",
  "Bacău",
  "Bihor",
  "Bistrița-Năsăud",
  "Botoșani",
  "Brașov",
  "Brăila",
  "București",
  "Buzău",
  "Caraș-Severin",
  "Călărași",
  "Cluj",
  "Constanța",
  "Covasna",
  "Dâmbovița",
  "Dolj",
  "Galați",
  "Giurgiu",
  "Gorj",
  "Harghita",
  "Hunedoara",
  "Ialomița",
  "Iași",
  "Ilfov",
  "Maramureș",
  "Mehedinți",
  "Mureș",
  "Neamț",
  "Olt",
  "Prahova",
  "Satu Mare",
  "Sălaj",
  "Sibiu",
  "Suceava",
  "Teleorman",
  "Timiș",
  "Tulcea",
  "Vaslui",
  "Vâlcea",
  "Vrancea",
] as const;

export type CauseCategoryId = (typeof CAUSE_CATEGORIES)[number]["id"];
export type AuctionCategoryId = (typeof AUCTION_CATEGORIES)[number]["id"];

export const FEATURED = {
  WEIGHT_BIDS: 3,
  WEIGHT_WATCHERS: 1,
  WEIGHT_DONATION: 2,
  MOST_WATCHED_COUNT: 6,
  MOST_WATCHED_SHOWN: { base: 6, md: 6, lg: 5 },
  LATEST_COUNT: 10,
  LATEST_SHOWN: { base: 8, md: 9, lg: 10 },
  TRENDING_CAUSES_COUNT: 3,
} as const;

export const RELATED = {
  WEIGHT_SAME_CAUSE: 10,
  WEIGHT_SAME_CATEGORY: 5,
  WEIGHT_SAME_SELLER: 2,
  WEIGHT_PRICE_PROXIMITY: 2,
  COUNT: 10,
  MIN_COUNT: 6,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 16,
  MAX_PAGE_SIZE: 60,
  REVEAL_HOLD_MS: 140,
} as const;
