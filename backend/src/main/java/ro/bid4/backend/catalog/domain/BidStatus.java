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
  WON,
  LOST
}
