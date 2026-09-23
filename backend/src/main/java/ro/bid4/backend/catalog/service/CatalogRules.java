package ro.bid4.backend.catalog.service;

import java.util.Set;

public final class CatalogRules {
  private CatalogRules() {}

  public static final long MAX_BID = 1_000_000L * 100L;

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

  public static final int DEFAULT_PAGE_SIZE = 16;

  public static final int MAX_PAGE_SIZE = 60;

  public static final double WEIGHT_BIDS = 3;

  public static final double WEIGHT_WATCHERS = 1;
  public static final double WEIGHT_DONATION = 2;

  public static final long DISPATCH_DAYS = 7;

  public static final int MOST_WATCHED_COUNT = 6;

  public static final int LATEST_COUNT = 10;

  public static final double RELATED_WEIGHT_SAME_CAUSE = 10;

  public static final double RELATED_WEIGHT_SAME_CATEGORY = 5;
  public static final double RELATED_WEIGHT_SAME_SELLER = 2;
  public static final double RELATED_WEIGHT_PRICE_PROXIMITY = 2;
  public static final int RELATED_COUNT = 10;
  public static final int RELATED_MIN_COUNT = 6;

  public static final int RANKING_WINDOW = 500;
}
