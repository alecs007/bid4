package ro.bid4.backend.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

/** The pair that identifies a watch. Nothing else about it is worth a surrogate key. */
@Embeddable
public class AuctionWatchId implements Serializable {

  @Column(name = "auction_id", nullable = false)
  private UUID auctionId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  protected AuctionWatchId() {}

  public AuctionWatchId(UUID auctionId, UUID userId) {
    this.auctionId = auctionId;
    this.userId = userId;
  }

  public UUID getAuctionId() {
    return auctionId;
  }

  public UUID getUserId() {
    return userId;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof AuctionWatchId that
        && Objects.equals(auctionId, that.auctionId)
        && Objects.equals(userId, that.userId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(auctionId, userId);
  }
}
