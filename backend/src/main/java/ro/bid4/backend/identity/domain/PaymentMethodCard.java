package ro.bid4.backend.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * A card on file, as far as this application is allowed to know it.
 *
 * <p>No column here can hold a card number. What is stored is what Stripe safely exposes about a
 * saved PaymentMethod, plus its opaque id — the brand, the last four digits and the expiry, which
 * is exactly enough for someone to recognise which card they meant.
 */
@Getter
@Setter
@Entity
@Table(name = "payment_methods")
public class PaymentMethodCard {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Column(nullable = false)
  private String provider = "STRIPE";

  @Column(name = "provider_method_id", nullable = false)
  private String providerMethodId;

  @Column(nullable = false)
  private String brand;

  @Column(nullable = false)
  private String last4;

  @Column(name = "exp_month", nullable = false)
  private short expMonth;

  @Column(name = "exp_year", nullable = false)
  private short expYear;

  @Column(name = "holder_name", nullable = false)
  private String holderName;

  @Column(name = "is_default", nullable = false)
  private boolean isDefault = false;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof PaymentMethodCard that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
