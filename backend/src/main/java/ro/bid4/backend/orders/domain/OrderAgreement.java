package ro.bid4.backend.orders.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/** One promise, by one party, at the moment they made it. */
@Entity
@Table(name = "order_agreements")
@Getter
@Setter
public class OrderAgreement {

  @Id @GeneratedValue private UUID id;

  @Column(name = "order_id", nullable = false)
  private UUID orderId;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private AgreementKind kind;

  /**
   * The version of the text shown, stored rather than referenced.
   *
   * <p>Looking it up later would answer "what do the terms say now", which is not the question a
   * dispute asks.
   */
  @Column(name = "terms_version", nullable = false, length = 32)
  private String termsVersion;

  @Column(name = "accepted_at", nullable = false)
  private Instant acceptedAt = Instant.now();

  public static OrderAgreement of(UUID orderId, UUID userId, AgreementKind kind, String version) {
    OrderAgreement agreement = new OrderAgreement();
    agreement.orderId = orderId;
    agreement.userId = userId;
    agreement.kind = kind;
    agreement.termsVersion = version;
    return agreement;
  }
}
