package ro.bid4.backend.orders.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "orders")
public class Order {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(nullable = false, updatable = false)
  private String reference;

  @Column(name = "auction_id", nullable = false, updatable = false)
  private UUID auctionId;

  @Column(name = "buyer_id", nullable = false, updatable = false)
  private UUID buyerId;

  @Column(name = "seller_id", nullable = false, updatable = false)
  private UUID sellerId;

  @Column(name = "cause_id", nullable = false, updatable = false)
  private UUID causeId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private OrderStatus status = OrderStatus.AWAITING_CONFIRMATION;

  @Column(name = "final_price", nullable = false, updatable = false)
  private long finalPrice;

  @Column(name = "platform_tax", nullable = false)
  private long platformTax;

  @Column(nullable = false)
  private long shipping;

  @Column(name = "total_paid", nullable = false)
  private long totalPaid;

  @Column(name = "donation_amount", nullable = false, updatable = false)
  private long donationAmount;

  @Column(name = "donation_percent", nullable = false, updatable = false)
  private short donationPercent;

  @Column(name = "seller_share", nullable = false, updatable = false)
  private long sellerShare;

  @Embedded private DeliverySnapshot delivery;

  @Column private String awb;

  @Column private String courier;

  @Column(name = "label_file_id")
  private UUID labelFileId;

  @Column(name = "confirmation_deadline")
  private Instant confirmationDeadline;

  @Column(name = "auto_release_at")
  private Instant autoReleaseAt;

  @Column(name = "payment_failure_reason")
  private String paymentFailureReason;

  @Column(name = "payment_reference")
  private String paymentReference;

  @Column(name = "payment_provider")
  private String paymentProvider;

  @Version
  @Column(nullable = false)
  private int version;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "paid_at")
  private Instant paidAt;

  @Column(name = "delivered_at")
  private Instant deliveredAt;

  @Column(name = "released_at")
  private Instant releasedAt;

  public boolean isBuyer(UUID userId) {
    return buyerId.equals(userId);
  }

  public boolean isSeller(UUID userId) {
    return sellerId.equals(userId);
  }

  public boolean isParty(UUID userId) {
    return userId != null && (isBuyer(userId) || isSeller(userId));
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof Order that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
