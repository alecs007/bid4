package ro.bid4.backend.orders.domain;

/**
 * What somebody agreed to, at the moment they did the thing it governs.
 *
 * <p>Three, because they are three different promises made by two different people at three
 * different moments. Collapsing them into one "accepted the terms" would lose which of them the
 * person was actually shown.
 */
public enum AgreementKind {
  /** Buyer, when the delivery is chosen and the total finally becomes known. */
  SALE,
  /** Buyer, at payment: what is held, by whom, and what releases it. */
  PAYMENT,
  /** Seller, when the label is issued: what they undertake to send, and by when. */
  SHIPPING
}
