package ro.bid4.backend.catalog.domain;

import org.springframework.data.domain.Sort;

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

  public Sort sort() {
    return sort.and(Sort.by(Sort.Direction.ASC, "id"));
  }
}
