package ro.bid4.backend.ledger.domain;

/**
 * What an account is for.
 *
 * <p>Five purposes and one counterparty. {@link #EXTERNAL} is the world outside bid4 — the card
 * that paid, the bank that was paid — and exists so that every entry has an other side; it is
 * expected to run deeply negative and is the only account allowed to.
 */
public enum AccountKind {
  /** A seller's own money, withdrawable. */
  USER_AVAILABLE,
  /** Raised for a cause and not yet paid out to the organisation behind it. */
  CAUSE_AVAILABLE,
  /** Paid by buyers and owed to nobody yet. This is the escrow. */
  PLATFORM_ESCROW,
  /** bid4's cut, which is the buyer's tax and only that. */
  PLATFORM_REVENUE,
  /** What the courier is owed, kept apart so revenue is not overstated. */
  PLATFORM_SHIPPING,
  EXTERNAL;

  /** Whether the account belongs to somebody, or is one of the platform's own. */
  public boolean isOwned() {
    return this == USER_AVAILABLE || this == CAUSE_AVAILABLE;
  }
}
