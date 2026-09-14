package ro.bid4.backend.inbox.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "conversations")
public class Conversation {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private ConversationKind kind = ConversationKind.LISTING;

  @Column(name = "listing_id")
  private UUID listingId;

  @Column(name = "buyer_id", nullable = false)
  private UUID buyerId;

  @Column(name = "seller_id")
  private UUID sellerId;

  @Column(name = "order_id")
  private UUID orderId;

  @Column(name = "last_item_at", nullable = false)
  private Instant lastItemAt = Instant.now();

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  public boolean isParty(UUID userId) {
    return userId != null && (userId.equals(buyerId) || userId.equals(sellerId));
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof Conversation that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
