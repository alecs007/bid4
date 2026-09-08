package ro.bid4.backend.ledger.repo;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.ledger.domain.LedgerEntry;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, UUID> {

  /** A wallet's movements, newest first. */
  List<LedgerEntry> findByAccountIdOrderByCreatedAtDesc(UUID accountId, Limit limit);

  List<LedgerEntry> findByTransactionId(UUID transactionId);
}
