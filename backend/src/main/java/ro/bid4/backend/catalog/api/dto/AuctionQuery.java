package ro.bid4.backend.catalog.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import ro.bid4.backend.catalog.domain.AuctionSort;
import ro.bid4.backend.catalog.domain.AuctionStatus;

/**
 * The AuctionFilters interface in frontend/src/lib/types/auction.ts, bound from the query string.
 *
 * <p>Every field is optional and every one is typed. {@code status} and {@code sort} arrive as
 * enums, so an unknown value is refused at binding rather than reaching a query, and the page size
 * is capped here as well as in the service — PAGINATION.MAX_PAGE_SIZE on the frontend.
 */
public record AuctionQuery(
    @Size(max = 120, message = "Termenul de căutare este prea lung.") String q,
    List<AuctionStatus> status,
    @Size(max = 16) List<String> category,
    UUID causeId,
    UUID sellerId,
    @Min(0) Long minPrice,
    @Min(0) Long maxPrice,
    @Min(0) @Max(100) Integer minDonationPercent,
    Boolean endingSoon,
    AuctionSort sort,
    @Min(1) Integer page,
    @Min(1) @Max(60) Integer pageSize) {

  public AuctionSort sortOrDefault() {
    return sort == null ? AuctionSort.ENDING_SOON : sort;
  }

  /** Page numbers are 1-based on the wire; Spring Data counts from 0. */
  public int zeroBasedPage() {
    return page == null ? 0 : page - 1;
  }

  public int pageSizeOrDefault(int fallback, int ceiling) {
    return pageSize == null ? fallback : Math.min(pageSize, ceiling);
  }
}
