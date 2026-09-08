package ro.bid4.backend.ledger.domain;

/** Why money moved. */
public enum TransactionKind {
  /** A buyer paid. Money enters bid4 and lands in escrow. */
  PAYMENT,
  /** A sale completed. Escrow divides between the cause, the seller and bid4. */
  RELEASE,
  /** A sale did not complete. Escrow goes back where it came from. */
  REFUND,
  /** Somebody withdrew. Their balance leaves bid4. */
  PAYOUT,
  /** A correction, written by hand and always as the reverse of something. */
  ADJUSTMENT
}
