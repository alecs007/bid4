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

/**
 * One sale, from the moment an offer is taken.
 *
 * <p>This row is the authority. A thread item says a step happened; this says what may happen now,
 * and every button either party is offered is derived from {@link #status} together with which of
 * them is asking. Nothing in a conversation can move a sale.
 *
 * <p>The money is frozen at acceptance and never recalculated. The fee schedule will change; a sale
 * that closed under the old one must not quietly restate itself under the new.
 *
 * <p>{@code version} rather than a row lock, because the transitions that matter will each end in a
 * call to a payment provider, and holding a database lock across that is how a slow third party
 * becomes a stuck table.
 */
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

  /** Copied at confirmation, not referenced: the saved address may be edited or deleted after. */
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

  /**
   * The provider's own id for the checkout, and which provider it was.
   *
   * <p>A callback names its session rather than our order, so without these a payment can only be
   * believed. Null for sales opened before a provider existed.
   */
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
