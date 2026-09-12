package ro.bid4.backend.orders.domain;

/**
 * A step of a sale, as it appears in the thread.
 *
 * <p>One per transition worth showing, and at most one of each per order — a unique index says so,
 * which is what makes a transition safe to retry.
 *
 * <p>An event is a record. Which of them still carries a button, and for whom, is worked out from
 * the order's current {@link OrderStatus} when the thread is drawn, so the one at the bottom is
 * live and everything above it is history.
 */
public enum OrderEvent {
  /** The seller took the offer. The buyer is asked where it should go. */
  OFFER_ACCEPTED,
  /** Delivery chosen, so the total is finally known. The buyer is asked to pay. */
  DELIVERY_CHOSEN,
  /** Paid into escrow. The seller is asked to send it. */
  PAYMENT_HELD,
  /** There is an AWB. The seller is asked to hand it over. */
  LABEL_READY,
  /** On its way. Nobody is asked anything. */
  SHIPPED,
  /** Arrived. The buyer is asked to confirm. */
  DELIVERED,
  /** Confirmed. The donation and the seller's share are released. */
  RELEASED,
  /** Something went wrong, and the clock stops until it is settled. */
  DISPUTE_OPENED,
  /** An operator has settled it, one way or the other. The clock starts again or it ends here. */
  DISPUTE_RESOLVED,
  CANCELLED
}
