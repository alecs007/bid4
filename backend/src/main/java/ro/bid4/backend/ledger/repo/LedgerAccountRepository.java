package ro.bid4.backend.ledger.repo;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.ledger.domain.AccountKind;
import ro.bid4.backend.ledger.domain.LedgerAccount;

public interface LedgerAccountRepository extends JpaRepository<LedgerAccount, UUID> {

  @Query("select a from LedgerAccount a where a.kind = :kind and a.ownerId is null")
  Optional<LedgerAccount> findPlatform(@Param("kind") AccountKind kind);

  Optional<LedgerAccount> findByKindAndOwnerId(AccountKind kind, UUID ownerId);

  /**
   * Moves a balance by an amount, in one statement.
   *
   * <p>Read-modify-write over an entity would lose one of two movements that land at the same
   * instant; a statement leaves the arithmetic to the database, and the row's own CHECK is what
   * refuses to let anybody's money go below zero.
   */
  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("update LedgerAccount a set a.balance = a.balance + :amount where a.id = :id")
  int addToBalance(@Param("id") UUID id, @Param("amount") long amount);

  /**
   * What the entries actually say this account holds.
   *
   * <p>The copy on the row is what pages read. This is what proves it, and is the only thing
   * entitled to correct it.
   */
  @Query(
      """
      select coalesce(sum(e.amount), 0) from LedgerEntry e
      where e.accountId = :accountId
      """)
  long sumEntries(@Param("accountId") UUID accountId);
}
