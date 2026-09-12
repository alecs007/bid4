package ro.bid4.backend.orders.domain;

/**
 * How a frozen sale ends.
 *
 * <p>Two, not three. A partial split is a real outcome and a different ledger movement, and it
 * needs an amount typed into an operator screen that does not exist yet — so it is absent rather
 * than approximated.
 */
public enum DisputeOutcome {
  /** The whole amount goes back out of escrow to the buyer. */
  REFUND,
  /** The delivery stands, and escrow divides as it would have on confirmation. */
  RELEASE
}
