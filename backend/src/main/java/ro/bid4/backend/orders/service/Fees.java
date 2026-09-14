package ro.bid4.backend.orders.service;

public final class Fees {
  public static final int BUYER_TAX_PERCENT = 5;

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
        finalPrice - donationAmount);
  }

  private static long percentOf(long amount, int percent) {
    return Math.round((amount * (double) percent) / 100);
  }
}
