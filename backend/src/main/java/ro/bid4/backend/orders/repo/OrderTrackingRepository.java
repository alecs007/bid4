package ro.bid4.backend.orders.repo;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import ro.bid4.backend.orders.domain.OrderTrackingEvent;

public interface OrderTrackingRepository extends JpaRepository<OrderTrackingEvent, UUID> {

  List<OrderTrackingEvent> findByOrderIdOrderByAtDesc(UUID orderId);

  /** The courier delivering the same scan twice must move the parcel once. */
  boolean existsByExternalId(String externalId);
}
