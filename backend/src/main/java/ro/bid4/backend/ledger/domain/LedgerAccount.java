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
 * One place money can be.
 *
 * <p>{@link #balance} is a copy, kept in the same transaction as the entries that move it. It is
 * what a page reads; the entries are what it means. Where the two ever disagree the entries are
 * right — which is why this column can be recomputed and those rows cannot be touched.
 */
@Getter
@Setter
@Entity
@Table(name = "ledger_accounts")
public class LedgerAccount {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false)
  private AccountKind kind;

  /** Null on the platform's own accounts, which are one each. */
  @Column(name = "owner_id", updatable = false)
  private UUID ownerId;

  @Column(nullable = false)
  private long balance;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  public static LedgerAccount of(AccountKind kind, UUID ownerId) {
    LedgerAccount account = new LedgerAccount();
    account.kind = kind;
    account.ownerId = ownerId;
    return account;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof LedgerAccount that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
