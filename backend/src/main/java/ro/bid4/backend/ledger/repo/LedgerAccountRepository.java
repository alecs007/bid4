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

  @Modifying(flushAutomatically = true, clearAutomatically = true)
  @Query("update LedgerAccount a set a.balance = a.balance + :amount where a.id = :id")
  int addToBalance(@Param("id") UUID id, @Param("amount") long amount);

  @Query(
      """
      select coalesce(sum(e.amount), 0) from LedgerEntry e
      where e.accountId = :accountId
      """)
  long sumEntries(@Param("accountId") UUID accountId);
}
