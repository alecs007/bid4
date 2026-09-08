package ro.bid4.backend.ledger.domain;

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
 * One movement of money, whose entries add to zero.
 *
 * <p>{@code idempotencyKey} is the whole of the retry story. A payment webhook delivered twice, a
 * release job that ran again after a crash, a button pressed on two tabs — each carries the same
 * key, and the second one collides on a unique index rather than moving the money again.
 */
@Getter
@Setter
@Entity
@Table(name = "ledger_transactions")
public class LedgerTransaction {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false)
  private TransactionKind kind;

  @Column(name = "order_id", updatable = false)
  private UUID orderId;

  @Column(name = "idempotency_key", nullable = false, updatable = false)
  private String idempotencyKey;

  @Column(updatable = false)
  private String memo;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof LedgerTransaction that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
