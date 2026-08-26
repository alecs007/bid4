package ro.bid4.backend.identity.repo;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.identity.domain.PaymentMethodCard;

public interface PaymentMethodRepository extends JpaRepository<PaymentMethodCard, UUID> {

  List<PaymentMethodCard> findByUserIdOrderByCreatedAtAsc(UUID userId);
}
