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

/**
 * A row of the users table.
 *
 * <p>Named UserAccount rather than User: Spring Security already has a User and one of the two
 * would always be the wrong import.
 *
 * <p>Nothing here is exposed over HTTP. The controller returns UserResponse, so a crafted request
 * body cannot reach role, status or totalRaised.
 */
@Getter
@Setter
@Entity
@Table(name = "users")
public class UserAccount {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(nullable = false)
  private String email;

  /**
   * Null for an account that only ever signed in through a provider. It is never given a
   * placeholder: a fabricated hash is a credential someone can eventually guess.
   */
  @Column(name = "password_hash")
  private String passwordHash;

  @Column(name = "display_name", nullable = false)
  private String displayName;

  @Column(nullable = false)
  private String username;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private UserRole role = UserRole.USER;

  @Enumerated(EnumType.STRING)
  @Column(name = "account_type", nullable = false)
  private AccountType accountType = AccountType.INDIVIDUAL;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private UserStatus status = UserStatus.ACTIVE;

  @Column(name = "org_legal_name")
  private String orgLegalName;

  @Column(name = "org_registration_number")
  private String orgRegistrationNumber;

  @Column(name = "avatar_url")
  private String avatarUrl;

  @Column(nullable = false)
  private String bio = "";

  private String city;

  @Column(name = "stripe_ready", nullable = false)
  private boolean stripeReady = false;

  @Column(name = "stripe_account_id")
  private String stripeAccountId;

  @Column(nullable = false)
  private java.math.BigDecimal rating = java.math.BigDecimal.ZERO;

  @Column(name = "rating_count", nullable = false)
  private int ratingCount = 0;

  /** Integer bani. Never a floating point type. */
  @Column(name = "total_raised", nullable = false)
  private long totalRaised = 0L;

  @Column(name = "failed_login_count", nullable = false)
  private int failedLoginCount = 0;

  @Column(name = "locked_until")
  private Instant lockedUntil;

  @Column(name = "last_login_at")
  private Instant lastLoginAt;

  @Column(name = "password_changed_at", nullable = false)
  private Instant passwordChangedAt = Instant.now();

  @Column(name = "email_verified_at")
  private Instant emailVerifiedAt;

  /** Bumped to invalidate every access token already issued to this user. */
  @Column(name = "token_version", nullable = false)
  private int tokenVersion = 0;

  @Column(name = "default_delivery_method_id")
  private UUID defaultDeliveryMethodId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Column(name = "updated_at", nullable = false)
  private Instant updatedAt = Instant.now();

  public boolean hasPassword() {
    return passwordHash != null && !passwordHash.isBlank();
  }

  public boolean isEmailVerified() {
    return emailVerifiedAt != null;
  }

  public boolean isLocked(Instant now) {
    return lockedUntil != null && lockedUntil.isAfter(now);
  }

  /**
   * Identity is the assigned id and nothing else. Lombok's generated equals would compare every
   * field, which breaks the moment an entity is mutated inside a collection.
   */
  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof UserAccount that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
