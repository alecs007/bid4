package ro.bid4.backend.catalog.domain;

import java.util.Set;

/**
 * Mirrors AuctionStatus in frontend/src/lib/types/auction.ts.
 *
 * <p>DRAFT — being composed by the seller. PENDING_REVIEW — staff spot-check before it goes live.
 * SCHEDULED — approved, starts later. LIVE — accepting bids. ENDED — the clock ran out and
 * settlement is running. SOLD — a winner above reserve, and an order exists. UNSOLD — no bids, or
 * the reserve was not met. CANCELLED — pulled by the seller or by staff.
 */
public enum AuctionStatus {
  DRAFT,
  PENDING_REVIEW,
  SCHEDULED,
  LIVE,
  ENDED,
  SOLD,
  UNSOLD,
  CANCELLED;

  /**
   * What anyone may see.
   *
   * <p>A draft, a listing waiting for review and a cancelled one are the seller's business. They
   * are excluded from every public read rather than filtered out in the UI, so browsing another
   * seller's shelf cannot enumerate what they have not published.
   */
  public static final Set<AuctionStatus> PUBLIC = Set.of(LIVE, SCHEDULED, ENDED, SOLD, UNSOLD);

  public boolean isPublic() {
    return PUBLIC.contains(this);
  }
}
