package ro.bid4.backend.identity.repo;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.identity.domain.DeliveryMethod;

public interface DeliveryMethodRepository extends JpaRepository<DeliveryMethod, UUID> {

  List<DeliveryMethod> findByUserIdOrderByCreatedAtAsc(UUID userId);
}
