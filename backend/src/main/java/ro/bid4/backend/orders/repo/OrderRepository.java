package ro.bid4.backend.orders.repo;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ro.bid4.backend.orders.domain.Order;
import ro.bid4.backend.orders.domain.OrderStatus;

public interface OrderRepository extends JpaRepository<Order, UUID> {
  @Query(
      """
      select o from Order o
      where o.auctionId = :auctionId
        and o.status not in (
          ro.bid4.backend.orders.domain.OrderStatus.CANCELLED,
          ro.bid4.backend.orders.domain.OrderStatus.REFUNDED)
      """)
  Optional<Order> findOpenForAuction(@Param("auctionId") UUID auctionId);

  Optional<Order> findByAwb(String awb);

  Optional<Order> findByPaymentReference(String paymentReference);

  @Query(
      """
      select o from Order o
      where o.buyerId = :userId or o.sellerId = :userId
      order by o.createdAt desc
      """)
  List<Order> findForParty(@Param("userId") UUID userId, Limit limit);

  boolean existsByReference(String reference);

  List<Order> findByStatusAndAutoReleaseAtBefore(OrderStatus status, Instant before);

  List<Order> findByStatusAndConfirmationDeadlineBefore(OrderStatus status, Instant before);
}
