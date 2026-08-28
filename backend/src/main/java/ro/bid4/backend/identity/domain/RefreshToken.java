package ro.bid4.backend.identity.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One issued refresh token, stored as a SHA-256 hash.
 *
 * <p>The token itself is shown to its owner once and never persisted, so a dump of this table
 * grants nothing. Tokens rotate on every use: the old row records what it was exchanged for, which
 * turns a replay of an already-spent token into detectable theft rather than a silent second
 * session.
 */
@Getter
@Setter
@Entity
@Table(name = "refresh_tokens")
public class RefreshToken {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "user_id", nullable = false)
  private UserAccount user;

  @Column(name = "token_hash", nullable = false, updatable = false, length = 64)
  private String tokenHash;

  @Column(name = "issued_at", nullable = false, updatable = false)
  private Instant issuedAt = Instant.now();

  /**
   * When the first token in this chain was issued, carried unchanged through every rotation.
   *
   * <p>expires_at moves forward on each exchange, which is what keeps an active session alive. This
   * does not, which is what eventually ends one: past bid4.jwt.absolute-refresh-ttl measured from
   * here, the chain is refused however recently it was used.
   */
  @Column(name = "family_started_at", nullable = false, updatable = false)
  private Instant familyStartedAt = Instant.now();

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "revoked_at")
  private Instant revokedAt;

  @Column(name = "rotated_to")
  private UUID rotatedTo;

  @Column(name = "user_agent")
  private String userAgent;

  /**
   * Postgres inet, not text. The column type is itself a validation: the database refuses anything
   * that is not an address. SqlTypes.INET is what makes Hibernate bind the parameter as one.
   */
  @JdbcTypeCode(SqlTypes.INET)
  @Column(name = "ip", columnDefinition = "inet")
  private String ip;

  public boolean isUsable(Instant now) {
    return revokedAt == null && rotatedTo == null && expiresAt.isAfter(now);
  }

  /** Whether the chain has outlived its absolute ceiling, however recently it was exchanged. */
  public boolean familyExpired(Instant now, Duration absoluteTtl) {
    return familyStartedAt.plus(absoluteTtl).isBefore(now);
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof RefreshToken that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
