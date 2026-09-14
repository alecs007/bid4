package ro.bid4.backend.identity.domain;

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
@Table(name = "delivery_methods")
public class DeliveryMethod {
  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "user_id", nullable = false)
  private UUID userId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private DeliveryMethodType type = DeliveryMethodType.EASYBOX;

  @Column(nullable = false)
  private String label;

  @Column(name = "easybox_locker_id")
  private String easyboxLockerId;

  @Column(name = "locker_name")
  private String lockerName;

  @Column(name = "locker_address")
  private String lockerAddress;

  @Column(name = "recipient_name")
  private String recipientName;

  private String street;
  private String city;
  private String county;

  @Column(name = "postal_code")
  private String postalCode;

  @Column(name = "address_details")
  private String addressDetails;

  @Column(nullable = false)
  private String phone;

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
    return other instanceof DeliveryMethod that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
