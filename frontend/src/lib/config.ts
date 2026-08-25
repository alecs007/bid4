/**
 * bid4 — single source of truth for every business constant.
 *
 * Nothing in the app may hard-code a fee, cap, timing or threshold: it belongs
 * here. `/admin/setari` renders this object, and when the Spring Boot backend
 * lands these values are served by `GET /config/platform` so staff can tune
 * them without a redeploy.
 *
 * TODO(backend): replace the literals below with a cached fetch of
 * `GET /config/platform` (returns exactly this shape).
 */

/** Integer minor units of RON. 1 leu = 100 bani. Money is NEVER a float. */
export type Bani = number;

export const LEU: Bani = 100;

/* ---------------------------------------------------------------------------
 * Environment / integration flags
 * ------------------------------------------------------------------------ */

/**
 * The single switch that swaps the mock layer for the real backend.
 * `NEXT_PUBLIC_USE_MOCK=false` + `NEXT_PUBLIC_API_BASE=...` and every function
 * in `lib/api/*` starts talking HTTP instead of returning seed data.
 */
export const USE_MOCK: boolean = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

/** Spring Boot dev server default. */
export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080/api";

/** Dev-only affordances (role switcher, seed-account quick login). */
export const SHOW_DEV_TOOLS: boolean =
  process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS !== "false" &&
  process.env.NODE_ENV !== "production";

/* ---------------------------------------------------------------------------
 * Fees & the money split — mirrored by the backend fee service
 * ------------------------------------------------------------------------ */

export const FEES = {
  /** Buyer-side platform tax: 5% of the hammer price, clamped to [5, 50] lei. */
  BUYER_TAX_PERCENT: 5,
  BUYER_TAX_MIN: 5 * LEU,
  BUYER_TAX_MAX: 50 * LEU,
  /**
   * Seller-side fee: 2% of the seller's share (i.e. of what is left after the
   * donation). Donating 100% therefore costs the seller exactly nothing.
   */
  SELLER_FEE_PERCENT: 2,
} as const;

/** Flat, mocked shipping prices per delivery type. */
export const SHIPPING_PRICES = {
  EASYBOX: 1499 as Bani,
  HOME_COURIER: 2299 as Bani,
} as const;

/* ---------------------------------------------------------------------------
 * Accounts
 * ------------------------------------------------------------------------ */

export const ACCOUNT = {
  MIN_PASSWORD_LENGTH: 8,
  MIN_DISPLAY_NAME_LENGTH: 2,
  MAX_DISPLAY_NAME_LENGTH: 60,
} as const;

/* ---------------------------------------------------------------------------
 * Causes — proposal, verification and the ceiling before it completes
 * ------------------------------------------------------------------------ */

export const CAUSE = {
  /**
   * What a cause may raise while staff are still checking it. The organiser is
   * told the number up front rather than discovering it at the ceiling.
   *
   * TODO(backend): enforced server-side when releasing escrow, not here.
   */
  UNVERIFIED_CAP: 5_000 * LEU,
  MIN_GOAL: 500 * LEU,
  MAX_GOAL: 500_000 * LEU,
  /** A cause with no evidence cannot be approved, so it cannot be submitted. */
  MIN_DOCUMENTS: 1,
  MAX_DOCUMENTS: 12,
  MAX_GALLERY_IMAGES: 6,
  MAX_UPLOAD_MB: 8,
  SHORT_DESCRIPTION_MAX: 160,
  STORY_MIN: 200,
  STORY_MAX: 4_000,
  /** What the organiser is promised on the success screen. */
  REVIEW_HOURS: 48,
  MIN_BENEFICIARY_AGE: 0,
  MAX_MINOR_AGE: 17,
} as const;

/* ---------------------------------------------------------------------------
 * Auctions
 * ------------------------------------------------------------------------ */

export const AUCTION = {
  /** A bid inside this window pushes `endTime` out by the same amount. */
  DEFAULT_ANTI_SNIPE_SECONDS: 120,
  MIN_ANTI_SNIPE_SECONDS: 30,
  MAX_ANTI_SNIPE_SECONDS: 600,

  MIN_STARTING_PRICE: 1 * LEU,
  MAX_STARTING_PRICE: 100_000 * LEU,
  DEFAULT_BID_INCREMENT: 5 * LEU,
  MIN_BID_INCREMENT: 1 * LEU,

  MIN_DURATION_HOURS: 1,
  MAX_DURATION_DAYS: 30,
  DEFAULT_DURATION_DAYS: 7,

  /** "Se termină curând" cut-off used by the homepage and the filters. */
  ENDING_SOON_HOURS: 24,
  /** An auction is "hot" from this many bids up. */
  HOT_BID_THRESHOLD: 8,
} as const;

export const DONATION = {
  MIN_PERCENT: 5,
  MAX_PERCENT: 100,
  /** Offered as one-tap choices in the listing form. */
  PRESET_PERCENTS: [10, 25, 50, 75, 100] as const,
  DEFAULT_PERCENT: 25,
  /** At or above this share the listing earns the "Erou" badge. */
  HERO_PERCENT: 75,
} as const;

/* ---------------------------------------------------------------------------
 * Orders, escrow & fulfilment timings
 * ------------------------------------------------------------------------ */

export const ORDER = {
  /** Winner has 24h to confirm delivery details before we auto-confirm. */
  CONFIRMATION_HOURS: 24,
  /** Funds auto-release this long after DELIVERED if the buyer stays silent. */
  AUTO_RELEASE_HOURS: 72,
  /** Seller must drop the parcel off within this window. */
  DROP_OFF_DAYS: 3,
  /** How long a buyer may still open a dispute after delivery. */
  DISPUTE_WINDOW_HOURS: 72,
  /** Retries of the off-session charge before the order is cancelled. */
  PAYMENT_RETRY_ATTEMPTS: 3,
} as const;

export const SHIPPING = {
  COURIER_NAME: "Sameday",
  SERVICE_NAME: "Sameday Easybox",
  /** Mock AWB format: 24 digits, like the real Sameday ones. */
  AWB_PREFIX: "2SD",
  TRACKING_URL_BASE: "https://sameday.ro/track",
  /** Default parcel weight when a seller does not supply one. */
  DEFAULT_WEIGHT_GRAMS: 500,
  MAX_WEIGHT_GRAMS: 15_000,
} as const;

/* ---------------------------------------------------------------------------
 * Mock behaviour — makes skeletons and error states visible in development
 * ------------------------------------------------------------------------ */

export const MOCK = {
  /** Simulated network latency window, in ms. */
  MIN_LATENCY_MS: 220,
  MAX_LATENCY_MS: 700,
  /** Probability that a read fails, so error states get exercised. */
  READ_FAILURE_RATE: 0,
  /** Probability that a mocked card charge is declined. */
  PAYMENT_FAILURE_RATE: 0.12,

  /**
   * Accelerated fulfilment clock. The real flow takes days; in the mock world
   * an order walks its whole timeline in a couple of minutes so the tracking
   * page can actually be watched moving.
   */
  AUTO_PAYMENT_DELAY_SECONDS: 8,
  AUTO_LABEL_DELAY_SECONDS: 6,
  COURIER_STEP_SECONDS: 40,
  /**
   * Only orders touched within this window keep moving on the accelerated
   * clock. Seeded history stays exactly where it was put, so the dashboards
   * always show every order state — including the genuinely transient ones.
   */
  SIMULATION_WINDOW_SECONDS: 1800,
  /** localStorage key + schema version. Bump to invalidate a stale world. */
  STORAGE_KEY: "bid4.world",
  SCHEMA_VERSION: 3,
  /**
   * Seeded auctions are dated relative to the moment the world was created,
   * so a world left in localStorage for a day ends up with everything closed.
   * Past this age it is reseeded, which keeps the demo alive.
   */
  MAX_WORLD_AGE_HOURS: 8,
} as const;

/* ---------------------------------------------------------------------------
 * Taxonomies (Romanian labels — these are user-facing)
 * ------------------------------------------------------------------------ */

export const CAUSE_CATEGORIES = [
  { id: "medical", label: "Sănătate", emoji: "🩺" },
  { id: "educatie", label: "Educație", emoji: "📚" },
  { id: "copii", label: "Copii", emoji: "🧸" },
  { id: "animale", label: "Animale", emoji: "🐾" },
  { id: "mediu", label: "Mediu", emoji: "🌱" },
  { id: "varstnici", label: "Vârstnici", emoji: "👵" },
  { id: "comunitate", label: "Comunitate", emoji: "🏘️" },
  { id: "urgente", label: "Urgențe", emoji: "🚨" },
] as const;

export const PRODUCT_CATEGORIES = [
  { id: "moda", label: "Modă", emoji: "👗" },
  { id: "electronice", label: "Electronice", emoji: "📱" },
  { id: "casa", label: "Casă & Decor", emoji: "🏡" },
  { id: "arta", label: "Artă & Handmade", emoji: "🎨" },
  { id: "carti", label: "Cărți & Media", emoji: "📖" },
  { id: "sport", label: "Sport & Outdoor", emoji: "⚽" },
  { id: "jucarii", label: "Jucării", emoji: "🧩" },
  { id: "colectii", label: "Colecții", emoji: "🏆" },
  { id: "bijuterii", label: "Bijuterii", emoji: "💍" },
] as const;

/** Every județ plus the capital, for beneficiary addresses. */
export const ROMANIAN_COUNTIES = [
  "Alba", "Arad", "Argeș", "Bacău", "Bihor", "Bistrița-Năsăud", "Botoșani",
  "Brașov", "Brăila", "București", "Buzău", "Caraș-Severin", "Călărași",
  "Cluj", "Constanța", "Covasna", "Dâmbovița", "Dolj", "Galați", "Giurgiu",
  "Gorj", "Harghita", "Hunedoara", "Ialomița", "Iași", "Ilfov", "Maramureș",
  "Mehedinți", "Mureș", "Neamț", "Olt", "Prahova", "Satu Mare", "Sălaj",
  "Sibiu", "Suceava", "Teleorman", "Timiș", "Tulcea", "Vaslui", "Vâlcea",
  "Vrancea",
] as const;

export type CauseCategoryId = (typeof CAUSE_CATEGORIES)[number]["id"];
export type ProductCategoryId = (typeof PRODUCT_CATEGORIES)[number]["id"];

/* ---------------------------------------------------------------------------
 * Homepage "featured" scoring — implemented for real in lib/featured.ts
 * ------------------------------------------------------------------------ */

export const FEATURED = {
  /** Weights of the popularity score: bids, watchers, urgency, donation share. */
  WEIGHT_BIDS: 3,
  WEIGHT_WATCHERS: 1,
  WEIGHT_URGENCY: 4,
  WEIGHT_DONATION: 2,
  /** How many cards each homepage row shows. */
  ENDING_SOON_COUNT: 4,
  POPULAR_COUNT: 8,
  TRENDING_CAUSES_COUNT: 3,
} as const;

/**
 * "More like this" on an auction page. Cause outweighs everything else: the
 * reason someone is on a bid4 listing is more often the cause behind it than
 * the object in front of it.
 */
export const RELATED = {
  WEIGHT_SAME_CAUSE: 10,
  WEIGHT_SAME_CATEGORY: 5,
  WEIGHT_SAME_SELLER: 2,
  /** Awarded in full at an identical price, tapering to nothing at 4x. */
  WEIGHT_PRICE_PROXIMITY: 2,
  /** Breaks ties towards what is worth acting on now. */
  WEIGHT_URGENCY: 1,
  COUNT: 10,
  /** Below this the row is not worth swiping, so it is topped up. */
  MIN_COUNT: 6,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 60,
} as const;
