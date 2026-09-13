package ro.bid4.backend.billing.repo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.billing.domain.DocumentKind;
import ro.bid4.backend.billing.domain.OrderDocument;

public interface OrderDocumentRepository extends JpaRepository<OrderDocument, UUID> {

  List<OrderDocument> findByOrderIdOrderByIssuedAtAsc(UUID orderId);

  Optional<OrderDocument> findByOrderIdAndKind(UUID orderId, DocumentKind kind);

  boolean existsByOrderIdAndKind(UUID orderId, DocumentKind kind);
}
