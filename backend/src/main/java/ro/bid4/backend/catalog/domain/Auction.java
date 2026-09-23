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

  @ElementCollection(fetch = FetchType.LAZY)
  @CollectionTable(name = "auction_images", joinColumns = @JoinColumn(name = "auction_id"))
  @OrderColumn(name = "sort_order")
  @Column(name = "url", nullable = false, length = 8192)
  @BatchSize(size = 64)
  private List<String> images = new ArrayList<>();

  @Column(nullable = false)
  private String category;

  @Enumerated(EnumType.STRING)
  @Column(name = "item_condition", nullable = false)
  private ItemCondition condition = ItemCondition.USED;

  @Column(name = "weight_grams", nullable = false)
  private int weightGrams;

  @Column(name = "donation_percent", nullable = false)
  private short donationPercent;

  @Column(name = "starting_price", nullable = false)
  private long startingPrice;

  @Column(name = "current_price", nullable = false)
  private long currentPrice;

  @Column(name = "reserve_price")
  private Long reservePrice;

  @Column(name = "buy_now_price")
  private Long buyNowPrice;

  @Column(name = "start_time", nullable = false)
  private Instant startTime;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private AuctionStatus status = AuctionStatus.DRAFT;

  @Column(name = "winner_id")
  private UUID winnerId;

  @Column(name = "bid_count", nullable = false)
  private int bidCount = 0;

  @Column(name = "watcher_count", nullable = false)
  private int watcherCount = 0;

  @Column(name = "accepted_bid_id")
  private UUID acceptedBidId;

  @Column(name = "accepted_at")
  private Instant acceptedAt;

  @Column(name = "dispatch_deadline")
  private Instant dispatchDeadline;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  public boolean isReserveMet() {
    return reservePrice == null || currentPrice >= reservePrice;
  }

  public boolean isBuyNowReachedBy(long amount) {
    return isBuyNowAvailable() && amount >= buyNowPrice;
  }

  public boolean isOpenForBids() {
    return status.isOpen();
  }

  public boolean isBuyNowAvailable() {
    return status == AuctionStatus.LIVE && buyNowPrice != null;
  }

  public boolean isCommitted() {
    return status.isCommitted();
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
