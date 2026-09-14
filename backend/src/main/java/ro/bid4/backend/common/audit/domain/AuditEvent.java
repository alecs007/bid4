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
