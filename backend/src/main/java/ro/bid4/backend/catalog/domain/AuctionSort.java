package ro.bid4.backend.catalog.domain;

import org.springframework.data.domain.Sort;

/**
 * Mirrors AuctionSort in frontend/src/lib/types/auction.ts.
 *
 * <p>An allow-list, and the reason sorting is expressed as one. The caller names an ordering, never
 * a column, so no query is ever built from a string that arrived over HTTP.
 */
public enum AuctionSort {
  NEWEST(Sort.by(Sort.Direction.DESC, "createdAt")),
  PRICE_ASC(Sort.by(Sort.Direction.ASC, "currentPrice")),
  PRICE_DESC(Sort.by(Sort.Direction.DESC, "currentPrice")),
  MOST_BIDS(Sort.by(Sort.Direction.DESC, "bidCount")),
  DONATION_DESC(Sort.by(Sort.Direction.DESC, "donationPercent"));

  private final Sort sort;

  AuctionSort(Sort sort) {
    this.sort = sort;
  }

  /**
   * Ties broken by id so paging is stable. Two auctions ending in the same second would otherwise
   * be free to swap places between page one and page two, and one of them would never be seen.
   */
  public Sort sort() {
    return sort.and(Sort.by(Sort.Direction.ASC, "id"));
  }
}
