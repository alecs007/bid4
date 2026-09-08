package ro.bid4.backend.ledger.domain;

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
 * One side of one movement.
 *
 * <p>Signed: positive is into the account, negative is out of it, and the entries of a transaction
 * add to zero — checked by a deferred constraint trigger, because they are necessarily unbalanced
 * while they are still being written.
 *
 * <p>Immutable. A trigger refuses updates and deletes outright: a mistake is corrected by writing
 * its reverse, exactly as it would be on paper.
 */
@Getter
@Setter
@Entity
@Table(name = "ledger_entries")
public class LedgerEntry {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "transaction_id", nullable = false, updatable = false)
  private UUID transactionId;

  @Column(name = "account_id", nullable = false, updatable = false)
  private UUID accountId;

  /** Bani. Never zero — a movement of nothing is not a movement. */
  @Column(nullable = false, updatable = false)
  private long amount;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  public static LedgerEntry of(UUID transactionId, UUID accountId, long amount) {
    LedgerEntry entry = new LedgerEntry();
    entry.transactionId = transactionId;
    entry.accountId = accountId;
    entry.amount = amount;
    return entry;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof LedgerEntry that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
