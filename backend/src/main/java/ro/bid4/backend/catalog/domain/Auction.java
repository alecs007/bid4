package ro.bid4.backend.catalog.domain;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.BatchSize;

/**
 * An auction: the object and the sale together.
 *
 * <p>There is no product entity. Nothing on this platform exists outside the auction that offers
 * it, so a second table would forever hold one row per auction, with the same owner and the same
 * lifecycle.
 *
 * <p>The seller, the cause and the winner are held as ids rather than as {@code @ManyToOne}
 * associations. With {@code open-in-view: false} a lazy association is a trap outside the
 * transaction that loaded it, and the read path needs whole pages of them at once anyway — so they
 * are fetched deliberately, in one query each, by the mapper.
 */
@Getter
@Setter
@Entity
@Table(name = "auctions")
public class Auction {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "seller_id", nullable = false)
  private UUID sellerId;

  @Column(name = "cause_id", nullable = false)
  private UUID causeId;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false)
  private String description;

  /**
   * Ordered: the first image is the card, and the seller chose which. Batched so a page of twelve
   * listings costs one extra query rather than twelve.
   */
  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "auction_images", joinColumns = @JoinColumn(name = "auction_id"))
  @OrderColumn(name = "sort_order")
  @Column(name = "url", nullable = false, length = 8192)
  @BatchSize(size = 64)
  private List<String> images = new ArrayList<>();

  /** Lower-case id from AUCTION_CATEGORIES; the CHECK constraint holds the set. */
  @Column(nullable = false)
  private String category;

  @Enumerated(EnumType.STRING)
  @Column(name = "item_condition", nullable = false)
  private ItemCondition condition = ItemCondition.USED;

  @Column(name = "weight_grams", nullable = false)
  private int weightGrams;

  /** 0–100. The share of the hammer price that reaches the cause. */
  @Column(name = "donation_percent", nullable = false)
  private short donationPercent;

  @Column(name = "starting_price", nullable = false)
  private long startingPrice;

  @Column(name = "current_price", nullable = false)
  private long currentPrice;

  @Column(name = "bid_increment", nullable = false)
  private long bidIncrement;

  /** Never leaves the application except to the seller. Buyers are told only whether it was met. */
  @Column(name = "reserve_price")
  private Long reservePrice;

  /**
   * The price that ends the auction outright, or null when there is none.
   *
   * <p>Public, unlike the reserve: it is an offer to the room, and one nobody can act on without
   * being told the number.
   */
  @Column(name = "buy_now_price")
  private Long buyNowPrice;

  @Column(name = "start_time", nullable = false)
  private Instant startTime;

  @Column(name = "end_time", nullable = false)
  private Instant endTime;

  @Column(name = "anti_snipe_seconds", nullable = false)
  private int antiSnipeSeconds = 120;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AuctionStatus status = AuctionStatus.DRAFT;

  @Column(name = "winner_id")
  private UUID winnerId;

  @Column(name = "bid_count", nullable = false)
  private int bidCount = 0;

  @Column(name = "watcher_count", nullable = false)
  private int watcherCount = 0;

  @Column(name = "extension_count", nullable = false)
  private int extensionCount = 0;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  /** True when there is no reserve, or the bidding has passed it. */
  public boolean isReserveMet() {
    return reservePrice == null || currentPrice >= reservePrice;
  }

  /** Whether an offer of this size takes the item outright. */
  public boolean isBuyNowReachedBy(long amount) {
    return buyNowPrice != null && amount >= buyNowPrice;
  }

  public boolean isLive(Instant now) {
    return status == AuctionStatus.LIVE && !startTime.isAfter(now) && endTime.isAfter(now);
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof Auction that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
