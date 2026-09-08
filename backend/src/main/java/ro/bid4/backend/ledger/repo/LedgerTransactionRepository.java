package ro.bid4.backend.ledger.repo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.ledger.domain.LedgerTransaction;

public interface LedgerTransactionRepository extends JpaRepository<LedgerTransaction, UUID> {

  Optional<LedgerTransaction> findByIdempotencyKey(String idempotencyKey);

  List<LedgerTransaction> findByOrderIdOrderByCreatedAtAsc(UUID orderId);
}
