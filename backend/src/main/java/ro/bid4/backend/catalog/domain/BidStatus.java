package ro.bid4.backend.catalog.domain;

/**
 * Mirrors BidStatus in frontend/src/lib/types/auction.ts.
 *
 * <p>WINNING is the leader while the auction runs, and a partial unique index allows exactly one
 * per auction. The read path resolves who is ahead from that index rather than by sorting the
 * history.
 */
public enum BidStatus {
  ACTIVE,
  OUTBID,
  WINNING,

  /**
   * The seller has taken this offer, and the buyer has not paid yet.
   *
   * <p>Distinct from WON, which is what it becomes once the money arrives. In between, the seller
   * can still release it and this goes back to ACTIVE.
   */
  ACCEPTED,
  WON,
  LOST
}
