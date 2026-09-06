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

  /**
   * The largest offer the platform will accept, in bani — one million lei.
   *
   * <p>Not a business ambition but a safety rail: an offer nobody could honour is a way to win an
   * auction and walk away from it, and every number downstream is computed from this one. The same
   * bound is a CHECK constraint on the bids table.
   */
  public static final long MAX_BID = 1_000_000L * 100L;

  /**
   * The categories a listing may claim, mirroring auctions_category_valid and AUCTION_CATEGORIES in
   * frontend/src/lib/config.ts.
   *
   * <p>Like every bound below it, checked by the service rather than left to the table: a
   * constraint violation reaches the seller as a 500 and a Postgres error string, where what they
   * need is a sentence naming the field to fix.
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

  /**
   * The ladder the bid step is read off, in bani: a listing at or below the first bound steps by
   * the first amount, and so on up.
   *
   * <p>The seller does not choose it. A step they picked was either so small that outbidding
   * somebody cost nothing and the price crawled a leu at a time, or so large that the second offer
   * was out of reach — and either way it was one more decision in the way of publishing.
   *
   * <p>Roughly five per cent of the asking price, snapped to a number a person would say out loud.
   * A step of 4,37 lei is arithmetically defensible and reads as a glitch.
   */
  private static final long[][] BID_STEP_LADDER = {
    // The bottom two rungs exist because the ladder without them asked a 1-leu
    // listing for a 5-leu raise: the second offer was six times the first,
    // which is the very thing a derived step is supposed to prevent.
    {1_000L, 50L}, // up to 10 lei: 0,50 lei
    {5_000L, 250L}, // up to 50 lei: 2,50 lei
    {10_000L, 500L}, // up to 100 lei: 5 lei
    {50_000L, 1_000L}, // up to 500 lei: 10 lei
    {100_000L, 2_500L}, // up to 1.000 lei: 25 lei
    {500_000L, 5_000L}, // up to 5.000 lei: 50 lei
    {1_000_000L, 10_000L}, // up to 10.000 lei: 100 lei
  };

  /** What every listing above the top of the ladder steps by: 250 lei. */
  private static final long BID_STEP_ABOVE_LADDER = 25_000L;

  /**
   * The step for a listing that starts at this price.
   *
   * <p>Derived rather than stored on the way in, so a listing created before the ladder changed
   * still steps by whatever the ladder says today, and there is one place to change it.
   */
  public static long bidStepFor(long startingPrice) {
    for (long[] rung : BID_STEP_LADDER) {
      if (startingPrice <= rung[0]) {
        return rung[1];
      }
    }
    return BID_STEP_ABOVE_LADDER;
  }

  /** Sixteen: four rows of four on a desktop, eight of two on a phone, ragged at neither. */
  public static final int DEFAULT_PAGE_SIZE = 16;

  public static final int MAX_PAGE_SIZE = 60;

  /**
   * Weights of the popularity score: bids, watchers, donation share.
   *
   * <p>There was a fourth, for how close a listing was to closing. Nothing closes any more.
   */
  public static final double WEIGHT_BIDS = 3;

  public static final double WEIGHT_WATCHERS = 1;
  public static final double WEIGHT_DONATION = 2;

  /**
   * How long a seller has to hand the parcel over once the money has arrived.
   *
   * <p>Counted from payment, not from acceptance: a seller should not be late for a parcel nobody
   * has paid them for yet.
   */
  public static final long DISPATCH_DAYS = 7;

  /**
   * The homepage's first row: the listings the most people are following.
   *
   * <p>Six, which is the most any width shows: the row is two cards across a phone, three across a
   * tablet and five across a desktop, and the page hides what a narrower row would leave hanging.
   * Sending four would leave the phone a row short of what it has room for.
   */
  public static final int MOST_WATCHED_COUNT = 6;

  /** And the second: two full desktop rows, trimmed to nine on a tablet and eight on a phone. */
  public static final int LATEST_COUNT = 10;

  /** "More like this": the cause outweighs the object, because it usually is the reason. */
  public static final double RELATED_WEIGHT_SAME_CAUSE = 10;

  public static final double RELATED_WEIGHT_SAME_CATEGORY = 5;
  public static final double RELATED_WEIGHT_SAME_SELLER = 2;
  public static final double RELATED_WEIGHT_PRICE_PROXIMITY = 2;
  public static final int RELATED_COUNT = 10;
  public static final int RELATED_MIN_COUNT = 6;

  /**
   * How many live auctions the homepage and "more like this" rank over.
   *
   * <p>Ranking is done in memory, so it needs a ceiling that does not grow with the platform. The
   * window is the newest listings: with no deadline left to sort on, recency is the only ordering
   * that still says something about which listings are worth ranking.
   */
  public static final int RANKING_WINDOW = 500;
}
