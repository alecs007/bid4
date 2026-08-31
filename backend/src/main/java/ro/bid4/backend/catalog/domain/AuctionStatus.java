package ro.bid4.backend.catalog.domain;

import java.util.Set;

/**
 * Where a listing stands.
 *
 * <p>A listing has no clock. It stays open until the seller accepts one of the offers on it or
 * withdraws it, so there is no state for "the time ran out": {@code ENDED} and {@code UNSOLD} were
 * reachable only from a timer and are gone, and {@code SCHEDULED} with them, because nothing is
 * published into the future any more.
 *
 * <p>The order after acceptance is the part worth reading. {@code RESERVED} is the seller's promise
 * and nothing more — the buyer has not paid, and the seller may still take it back. {@code SOLD}
 * only follows money actually changing hands, which is what starts the dispatch deadline and what
 * makes the listing undeletable.
 */
public enum AuctionStatus {
  /** Being written. Only its seller can see it. */
  DRAFT,

  /** Submitted, waiting for a moderator. */
  PENDING_REVIEW,

  /** Published and taking offers, for as long as the seller leaves it up. */
  LIVE,

  /**
   * The seller has accepted an offer and is waiting for that buyer to pay.
   *
   * <p>Reversible, and still open. The seller can release it back to {@code LIVE} while it is
   * unpaid — the escape hatch for a buyer who accepts and then disappears — and because they can,
   * the room keeps bidding. A better offer arriving during the wait is precisely what the seller
   * would want to know about, so nothing here stops one being made.
   */
  RESERVED,

  /** Paid for. The seller now owes a dispatch, and nobody can delete the row. */
  SOLD,

  /** Withdrawn by its seller or by a moderator. Terminal. */
  CANCELLED;

  /** The states a stranger may see. A draft and a listing under review are private. */
  public static final Set<AuctionStatus> PUBLIC = Set.of(LIVE, RESERVED, SOLD, CANCELLED);

  /**
   * Past the point of no return: money is involved, so the row has to stay.
   *
   * <p>Deliberately not "is it SOLD": the moment an offer is accepted there is a buyer with an
   * expectation, and deleting the listing under them would leave an order pointing at nothing.
   */
  public static final Set<AuctionStatus> COMMITTED = Set.of(RESERVED, SOLD);

  public boolean isPublic() {
    return PUBLIC.contains(this);
  }

  /** True once a buyer is attached, whether or not they have paid yet. */
  public boolean isCommitted() {
    return COMMITTED.contains(this);
  }

  /**
   * True while the listing is still collecting offers.
   *
   * <p>Includes {@code RESERVED}: an acceptance can still be undone, so an offer made against one
   * is not wasted. Only payment closes the room.
   */
  public boolean isOpen() {
    return this == LIVE || this == RESERVED;
  }
}
