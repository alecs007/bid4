package ro.bid4.backend.common.audit.domain;

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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * One thing that happened and that somebody may later have to answer for.
 *
 * <p>The actor is a plain uuid rather than a relation to UserAccount, and deliberately so: this
 * lives in common, which must not know what the features above it look like, and an audit row that
 * lazily loads a user is one that can fail while being read. The column is still a foreign key with
 * ON DELETE SET NULL, so a deleted account empties the field without taking the record with it.
 *
 * <p>The table's jsonb {@code detail} column is not mapped. It defaults to an empty object, and no
 * caller yet has anything to put in it that action, entity and ip do not already say.
 */
@Getter
@Setter
@Entity
@Table(name = "audit_log")
public class AuditEvent {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(nullable = false, updatable = false)
  private Long id;

  @Column(name = "at", nullable = false, updatable = false)
  private Instant at = Instant.now();

  @Column(name = "actor_id")
  private UUID actorId;

  /** Postgres inet, not text — see RefreshToken.ip for why the column type is the validation. */
  @JdbcTypeCode(SqlTypes.INET)
  @Column(name = "actor_ip", columnDefinition = "inet")
  private String actorIp;

  @Column(name = "action", nullable = false, length = 64)
  private String action;

  @Column(name = "entity_type", length = 40)
  private String entityType;

  @Column(name = "entity_id")
  private UUID entityId;

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof AuditEvent that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
