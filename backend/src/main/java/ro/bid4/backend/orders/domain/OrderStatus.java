package ro.bid4.backend.orders.domain;

public enum OrderStatus {
  AWAITING_CONFIRMATION,
  AWAITING_PAYMENT,
  PAYMENT_FAILED,
  PAID_HELD,
  LABEL_GENERATED,
  DROPPED_OFF,
  IN_TRANSIT,
  ARRIVED_AT_LOCKER,
  DELIVERED,
  COMPLETED,
  DISPUTE_OPEN,
  DISPUTE_RESOLVED,
  REFUNDED,
  CANCELLED;

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
