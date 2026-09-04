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

/**
 * Where the site answers from, used to make every canonical and every social
 * card an absolute URL.
 *
 * <p>Relative metadata is legal and useless: a crawler resolving a preview image
 * has no page to resolve it against, and a canonical that is not absolute cannot
 * say which of two hosts is the real one. The localhost default keeps a clean
 * clone working; set it per deployment.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

/**
 * The role switcher and the seed-account quick login.
 *
 * <p>On whenever the app is running against the mock world, not only in development: a deployment
 * with no backend behind it is a demo, and the accounts it invites people to sign in as are the
 * seeded ones. The real deployment sets `NEXT_PUBLIC_USE_MOCK=false`, which turns both off again.
 */
export const SHOW_DEV_TOOLS: boolean =
  process.env.NEXT_PUBLIC_SHOW_DEV_TOOLS !== "false" &&
  (USE_MOCK || process.env.NODE_ENV !== "production");

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
  MIN_STARTING_PRICE: 1 * LEU,
  MAX_STARTING_PRICE: 100_000 * LEU,

  /**
   * The ladder the bid step is read off, in bani: a listing at or below the first bound steps
   * by the first amount, and so on up. Mirrors CatalogRules.BID_STEP_LADDER on the server.
   *
   * The seller does not choose it. A step they picked was either so small that outbidding
   * somebody cost nothing, or so large that the second offer was out of reach — and either
   * way it was one more decision in the way of publishing.
   */
  BID_STEP_LADDER: [
    // The bottom two rungs exist because the ladder without them asked a 1-leu
    // listing for a 5-leu raise: the second offer was six times the first, which
    // is the very thing a derived step is supposed to prevent.
    [10 * LEU, LEU / 2],
    [50 * LEU, 2.5 * LEU],
    [100 * LEU, 5 * LEU],
    [500 * LEU, 10 * LEU],
    [1_000 * LEU, 25 * LEU],
    [5_000 * LEU, 50 * LEU],
    [10_000 * LEU, 100 * LEU],
  ] as const,
  /** What every listing above the top of the ladder steps by. */
  BID_STEP_ABOVE_LADDER: 250 * LEU,

  /** How long a seller has to hand the parcel over, counted from payment. */
  DISPATCH_DAYS: 7,

  /**
   * The three parcels a seller picks between, instead of typing a weight.
   *
   * <p>Nobody knows what their jacket weighs in grams, and the number was only ever there to land
   * in a courier band. So the seller picks the band directly, and `weightGrams` is the top of it —
   * the price quoted is then the one the courier charges rather than an optimistic guess.
   *
   * <p>Each `examples` line names one object the whole parcel is the size of, rather than listing
   * what could go in it: the three bands are the easybox compartments, and a compartment is a
   * volume. "Cât o cutie de pantofi" is a thing the seller can hold up against what is in front of
   * them; "pantofi, o geacă, un aparat mic" asks them to guess which list theirs belongs to.
   *
   * <p>`illustration` names a file under `public/images/illustrations`. Left null the picker draws
   * the parcel icon instead, so the three are usable before the artwork exists and need no code
   * change when it arrives.
   */
  PARCEL_TYPES: [
    {
      id: "small",
      label: "Colet mic",
      examples: "Cât un plic",
      weightGrams: 1_000,
      illustration: null as string | null,
    },
    {
      id: "medium",
      label: "Colet mediu",
      examples: "Cât o cutie de pantofi",
      weightGrams: 5_000,
      illustration: null as string | null,
    },
    {
      id: "large",
      label: "Colet mare",
      examples: "Cât un bagaj de mână",
      weightGrams: 15_000,
      illustration: null as string | null,
    },
  ],

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

  /** An auction is "hot" from this many bids up. */
  HOT_BID_THRESHOLD: 8,
} as const;

/**
 * The step for a listing that starts at this price — the twin of CatalogRules.bidStepFor.
 *
 * Derived rather than stored, so a listing created before the ladder changed still steps by
 * whatever the ladder says today, and there is one place to change it.
 */
export function bidStepFor(startingPrice: Bani): Bani {
  for (const [bound, step] of AUCTION.BID_STEP_LADDER) {
    if (startingPrice <= bound) return step;
  }
  return AUCTION.BID_STEP_ABOVE_LADDER;
}

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

/** Every județ plus the capital, for beneficiary addresses. */
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
  /**
   * Weights of the popularity score: bids, watchers, donation share.
   *
   * There was a fourth, for how close a listing was to closing. Nothing closes any more. The
   * homepage no longer ranks by this either — it is what tops up a short "more like this" row.
   */
  WEIGHT_BIDS: 3,
  WEIGHT_WATCHERS: 1,
  WEIGHT_DONATION: 2,
  /** How many cards each homepage row shows. */
  MOST_WATCHED_COUNT: 4,
  LATEST_COUNT: 8,
  TRENDING_CAUSES_COUNT: 3,
} as const;

/** "More like this": the cause outweighs the object, because it usually is the reason. */
export const RELATED = {
  WEIGHT_SAME_CAUSE: 10,
  WEIGHT_SAME_CATEGORY: 5,
  WEIGHT_SAME_SELLER: 2,
  /** Awarded in full at an identical price, tapering to nothing at 4x. */
  WEIGHT_PRICE_PROXIMITY: 2,
  COUNT: 10,
  /** Below this the row is not worth swiping, so it is topped up. */
  MIN_COUNT: 6,
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 12,
  MAX_PAGE_SIZE: 60,
  /**
   * How long the placeholders stand once the page has reached the top, before the new results
   * are revealed.
   *
   * <p>A beat, not a delay. Without it a cached page swaps in the same frame the scroll lands and
   * the whole change happens at once, which reads as a flicker rather than as a new page.
   */
  REVEAL_HOLD_MS: 260,
} as const;
