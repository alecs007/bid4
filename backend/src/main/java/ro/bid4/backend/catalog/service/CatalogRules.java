package ro.bid4.backend.catalog.service;

/**
 * The server-side twin of AUCTION, FEATURED, RELATED and PAGINATION in frontend/src/lib/config.ts.
 *
 * <p>One class, so there is one place to change when these move behind {@code GET /config/platform}
 * and stop being literals on either side. A number that appears in two files eventually appears as
 * two different numbers.
 */
public final class CatalogRules {

  private CatalogRules() {}

  /** The "se termină curând" cut-off, shared by the filter and by the urgency weight. */
  public static final long ENDING_SOON_HOURS = 24;

  /**
   * The largest offer the platform will accept, in bani — one million lei.
   *
   * <p>Not a business ambition but a safety rail: an offer nobody could honour is a way to win an
   * auction and walk away from it, and every number downstream is computed from this one. The same
   * bound is a CHECK constraint on the bids table.
   */
  public static final long MAX_BID = 1_000_000L * 100L;

  public static final int DEFAULT_PAGE_SIZE = 12;
  public static final int MAX_PAGE_SIZE = 60;

  /** Weights of the popularity score: bids, watchers, urgency, donation share. */
  public static final double WEIGHT_BIDS = 3;

  public static final double WEIGHT_WATCHERS = 1;
  public static final double WEIGHT_URGENCY = 4;
  public static final double WEIGHT_DONATION = 2;

  public static final int ENDING_SOON_COUNT = 4;
  public static final int POPULAR_COUNT = 8;

  /** "More like this": the cause outweighs the object, because it usually is the reason. */
  public static final double RELATED_WEIGHT_SAME_CAUSE = 10;

  public static final double RELATED_WEIGHT_SAME_CATEGORY = 5;
  public static final double RELATED_WEIGHT_SAME_SELLER = 2;
  public static final double RELATED_WEIGHT_PRICE_PROXIMITY = 2;
  public static final double RELATED_WEIGHT_URGENCY = 1;
  public static final int RELATED_COUNT = 10;
  public static final int RELATED_MIN_COUNT = 6;

  /**
   * How many live auctions the homepage and "more like this" rank over.
   *
   * <p>Ranking is done in memory, so it needs a ceiling that does not grow with the platform. The
   * window is the soonest-closing listings, which is where urgency — one of the weights — already
   * points.
   */
  public static final int RANKING_WINDOW = 500;
}
