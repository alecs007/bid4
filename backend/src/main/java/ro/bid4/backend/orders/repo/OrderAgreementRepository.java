package ro.bid4.backend.orders.repo;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.orders.domain.AgreementKind;
import ro.bid4.backend.orders.domain.OrderAgreement;

public interface OrderAgreementRepository extends JpaRepository<OrderAgreement, UUID> {
  List<OrderAgreement> findByOrderIdOrderByAcceptedAtAsc(UUID orderId);

  boolean existsByOrderIdAndUserIdAndKind(UUID orderId, UUID userId, AgreementKind kind);
}
