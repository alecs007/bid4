package ro.bid4.backend.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import ro.bid4.backend.catalog.domain.AuctionSort;
import ro.bid4.backend.catalog.domain.AuctionStatus;
import ro.bid4.backend.catalog.domain.ItemCondition;

public record AuctionQuery(
    @Size(max = 120, message = "Termenul de căutare este prea lung.") String q,
    List<AuctionStatus> status,
    @Size(max = 16) List<String> category,
    List<ItemCondition> condition,
    UUID causeId,
    UUID sellerId,
    @Min(0) Long minPrice,
    @Min(0) Long maxPrice,
    @Min(0) @Max(100) Integer minDonationPercent,
    AuctionSort sort,
    @Min(1) Integer page,
    @Min(1) @Max(60) Integer pageSize) {
  public AuctionSort sortOrDefault() {
    return sort == null ? AuctionSort.NEWEST : sort;
  }

  public int zeroBasedPage() {
    return page == null ? 0 : page - 1;
  }

  public int pageSizeOrDefault(int fallback, int ceiling) {
    return pageSize == null ? fallback : Math.min(pageSize, ceiling);
  }
}
