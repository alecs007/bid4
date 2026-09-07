package ro.bid4.backend.orders.service;

/**
 * What a sale costs, and to whom.
 *
 * <p>One cut, and the buyer pays it: a percentage of the price plus a fixed amount, charged over
 * the price rather than taken out of it. The price itself divides in two — the cause's share and
 * the seller's — so the number on the listing is the number that arrives. Mirrors {@code
 * computeFees} in frontend/src/lib/money.ts, and the two have to move together.
 *
 * <p>The fixed part exists because a percentage alone was dishonest at the bottom of the range: a
 * twenty-lei item cost five lei to protect either way, which is 25% under a 5% label. Everything is
 * in bani, and every division rounds half up, so no sale is ever a leu short of adding up.
 */
public final class Fees {

  public static final int BUYER_TAX_PERCENT = 5;

  /** 2.50 lei, in bani. */
  public static final long BUYER_TAX_FIXED = 250;

  private Fees() {}

  public record Breakdown(
      long finalPrice,
      long buyerTax,
      long shipping,
      long buyerTotal,
      short donationPercent,
      long donationAmount,
      long sellerShare) {}

  public static Breakdown compute(long finalPrice, int donationPercent, long shipping) {
    short safePercent = (short) Math.min(100, Math.max(0, donationPercent));

    long buyerTax = percentOf(finalPrice, BUYER_TAX_PERCENT) + BUYER_TAX_FIXED;
    long donationAmount = percentOf(finalPrice, safePercent);

    return new Breakdown(
        finalPrice,
        buyerTax,
        shipping,
        finalPrice + buyerTax + shipping,
        safePercent,
        donationAmount,
        // Subtraction rather than a second percentage, so the two halves add up
        // to the price exactly however the rounding fell.
        finalPrice - donationAmount);
  }

  private static long percentOf(long amount, int percent) {
    return Math.round((amount * (double) percent) / 100);
  }
}
