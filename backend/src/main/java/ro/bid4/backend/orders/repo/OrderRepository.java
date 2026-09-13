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

  /** The sale a listing is in the middle of, if it is in one. */
  @Query(
      """
      select o from Order o
      where o.auctionId = :auctionId
        and o.status not in (
          ro.bid4.backend.orders.domain.OrderStatus.CANCELLED,
          ro.bid4.backend.orders.domain.OrderStatus.REFUNDED)
      """)
  Optional<Order> findOpenForAuction(@Param("auctionId") UUID auctionId);

  /**
   * The sale a parcel belongs to.
   *
   * <p>A courier's callback names the consignment, not the order: it has never heard of our ids.
   * One AWB belongs to one sale because a sale books at most one parcel.
   */
  Optional<Order> findByAwb(String awb);

  /** The sale a payment provider's callback is about. */
  Optional<Order> findByPaymentReference(String paymentReference);

  @Query(
      """
      select o from Order o
      where o.buyerId = :userId or o.sellerId = :userId
      order by o.createdAt desc
      """)
  List<Order> findForParty(@Param("userId") UUID userId, Limit limit);

  boolean existsByReference(String reference);

  /**
   * Orders whose money is due to release itself.
   *
   * <p>Read by a scheduled job rather than by a request: nobody presses "release", and a buyer who
   * says nothing must not leave a seller unpaid forever.
   */
  List<Order> findByStatusAndAutoReleaseAtBefore(OrderStatus status, Instant before);

  /** Sales whose buyer never said where to send it, past the window they had to. */
  List<Order> findByStatusAndConfirmationDeadlineBefore(OrderStatus status, Instant before);
}
