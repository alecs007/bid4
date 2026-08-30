/**
 * Every fee, cap, timing and threshold belongs here — nothing in the app may
 * hard-code one. `/admin/setari` renders this object.
 *
 * TODO(backend): replace the literals with a cached fetch of
 * `GET /config/platform`, which returns exactly this shape.
 */

/** Integer minor units of RON. 1 leu = 100 bani. Money is NEVER a float. */
export type Bani = number;

export const LEU: Bani = 100;

/** The single switch that swaps the mock layer for the real backend. */
export const USE_MOCK: boolean = process.env.NEXT_PUBLIC_USE_MOCK !== "false";

/** Spring Boot dev server default. */
export const API_BASE: string =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

/** Dev-only affordances (role switcher, seed-account quick login). */
export const SHOW_DEV_TOOLS: boolean =
  process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS !== "false" &&
  process.env.NODE_ENV !== "production";

export const FEES = {
  /**
   * Buyer-side protection fee: a percentage of the hammer price plus a fixed
   * amount, quoted on the listing as "5% + 2 lei".
   *
   * <p>It was a percentage clamped to [5, 50] lei, which made a 20-lei item pay
   * 5 lei, or 25% under a 5% label. The fixed part covers what every order costs
   * regardless of price, so the percentage can stay honest at both ends.
   */
  BUYER_TAX_PERCENT: 5,
  BUYER_TAX_FIXED: 2.5 * LEU,
  /** 2% of the seller's share, so donating 100% costs the seller nothing. */
  SELLER_FEE_PERCENT: 2,
} as const;

/** Flat, mocked shipping prices per delivery type. */
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
  /**
   * What a cause may raise while staff are still checking it.
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

  /** A listing with no photo does not sell, and the first one is the card. */
  MIN_IMAGES: 1,
  MAX_IMAGES: 8,
  /** Mirrors the column widths: varchar(120) and varchar(4000). */
  MAX_TITLE_LENGTH: 120,
  MIN_TITLE_LENGTH: 8,
  MAX_DESCRIPTION_LENGTH: 4000,
  MIN_DESCRIPTION_LENGTH: 20,
  MIN_WEIGHT_GRAMS: 1,
  MAX_WEIGHT_GRAMS: 15_000,

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
  /** Working days from hand-off to delivery, quoted on the listing. */
  DELIVERY_DAYS_MIN: 1,
  DELIVERY_DAYS_MAX: 2,
  SERVICE_NAME: "Sameday Easybox",
  /** Mock AWB format: 24 digits, like the real Sameday ones. */
  AWB_PREFIX: "2SD",
  TRACKING_URL_BASE: "https://sameday.ro/track",
  /** Default parcel weight when a seller does not supply one. */
  DEFAULT_WEIGHT_GRAMS: 500,
  MAX_WEIGHT_GRAMS: 15_000,
} as const;

export const MOCK = {
  /** Simulated network latency window, in ms. */
  MIN_LATENCY_MS: 220,
  MAX_LATENCY_MS: 700,
  /** Probability that a read fails, so error states get exercised. */
  READ_FAILURE_RATE: 0,
  /** Probability that a mocked card charge is declined. */
  PAYMENT_FAILURE_RATE: 0.12,

  /** Accelerated clock: an order walks its whole timeline in a couple of minutes. */
  AUTO_PAYMENT_DELAY_SECONDS: 8,
  AUTO_LABEL_DELAY_SECONDS: 6,
  COURIER_STEP_SECONDS: 40,
  /**
   * Only orders touched within this window keep moving. Seeded history stays
   * where it was put, so the dashboards show every order state.
   */
  SIMULATION_WINDOW_SECONDS: 1800,
  /** localStorage key + schema version. Bump to invalidate a stale world. */
  STORAGE_KEY: "bid4.world",
  SCHEMA_VERSION: 6,
  /**
   * Seeded auctions are dated from when the world was created, so an old world
   * ends up with everything closed. Past this age it is reseeded.
   */
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
  { id: "moda", label: "Modă" },
  { id: "electronice", label: "Electronice" },
  { id: "casa", label: "Casă & Decor" },
  { id: "arta", label: "Artă & Handmade" },
  { id: "carti", label: "Cărți & Media" },
  { id: "sport", label: "Sport & Outdoor" },
  { id: "jucarii", label: "Jucării" },
  { id: "colectii", label: "Colecții" },
  { id: "bijuterii", label: "Bijuterii" },
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
export type AuctionCategoryId = (typeof AUCTION_CATEGORIES)[number]["id"];

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

/** "More like this": the cause outweighs the object, because it usually is the reason. */
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
