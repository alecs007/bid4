package ro.bid4.backend.catalog.service;

import java.util.Set;

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

  /**
   * What a new listing must look like. Every bound mirrors AUCTION and DONATION in
   * frontend/src/lib/config.ts and a CHECK constraint on the auctions table, so a value the form
   * accepts is a value the service accepts is a value the table accepts.
   *
   * <p>The service checks them anyway rather than letting the database refuse: a constraint
   * violation is a 500 and a Postgres error string, where the seller needs a sentence saying which
   * field to fix.
   */
  /**
   * The categories a listing may claim, mirroring auctions_category_valid and AUCTION_CATEGORIES in
   * frontend/src/lib/config.ts. Checked here so an unknown one is a sentence about the category
   * rather than a constraint violation surfacing as a 500.
   */
  public static final Set<String> CATEGORIES =
      Set.of(
          "moda",
          "electronice",
          "casa",
          "arta",
          "carti",
          "sport",
          "jucarii",
          "colectii",
          "bijuterii");

  public static final int MIN_TITLE_LENGTH = 8;

  public static final int MAX_TITLE_LENGTH = 120;
  public static final int MIN_DESCRIPTION_LENGTH = 20;
  public static final int MAX_DESCRIPTION_LENGTH = 4000;
  public static final int MIN_IMAGES = 1;
  public static final int MAX_IMAGES = 8;
  public static final int MAX_IMAGE_URL_LENGTH = 8192;
  public static final int MIN_WEIGHT_GRAMS = 1;
  public static final int MAX_WEIGHT_GRAMS = 15_000;
  public static final int MIN_DONATION_PERCENT = 5;
  public static final int MAX_DONATION_PERCENT = 100;
  public static final long MIN_STARTING_PRICE = 100L;
  public static final long MAX_STARTING_PRICE = 10_000_000L;
  public static final long MIN_BID_INCREMENT = 100L;
  public static final int MIN_ANTI_SNIPE_SECONDS = 30;
  public static final int MAX_ANTI_SNIPE_SECONDS = 600;
  public static final long MIN_DURATION_HOURS = 1;
  public static final long MAX_DURATION_DAYS = 30;

  /** How far ahead a listing may be scheduled to open. */
  public static final long MAX_START_DELAY_DAYS = 30;

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
