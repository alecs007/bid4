package ro.bid4.backend.orders.domain;

/**
 * Where a sale has got to, and the only thing entitled to say what may happen next.
 *
 * <p>The happy path runs AWAITING_CONFIRMATION → AWAITING_PAYMENT → PAID_HELD → LABEL_GENERATED →
 * DROPPED_OFF → IN_TRANSIT → ARRIVED_AT_LOCKER → DELIVERED → COMPLETED. Money sits with the
 * platform from PAID_HELD until COMPLETED, and nothing shown to either party may suggest the seller
 * has already been paid before then.
 *
 * <p>The three in the middle — IN_TRANSIT, ARRIVED_AT_LOCKER, DELIVERED — are the courier's to
 * declare, never a button. Neither party should be able to claim a parcel moved.
 */
public enum OrderStatus {
  /** The buyer has won and has to say where it goes. */
  AWAITING_CONFIRMATION,
  AWAITING_PAYMENT,
  PAYMENT_FAILED,
  /** Paid. The money is held by bid4 and belongs to nobody yet. */
  PAID_HELD,
  LABEL_GENERATED,
  DROPPED_OFF,
  IN_TRANSIT,
  ARRIVED_AT_LOCKER,
  DELIVERED,
  /** Confirmed received. The donation and the seller's share are released. */
  COMPLETED,
  DISPUTE_OPEN,
  DISPUTE_RESOLVED,
  REFUNDED,
  CANCELLED;

  /** Past the point where money is involved, which is where most refusals begin. */
  public boolean isPaid() {
    return this != AWAITING_CONFIRMATION
        && this != AWAITING_PAYMENT
        && this != PAYMENT_FAILED
        && this != CANCELLED;
  }

  public boolean isFinished() {
    return this == COMPLETED || this == REFUNDED || this == CANCELLED;
  }
}
