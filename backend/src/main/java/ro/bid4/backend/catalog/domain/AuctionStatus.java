package ro.bid4.backend.catalog.domain;

import java.util.Set;

public enum AuctionStatus {
  DRAFT,

  PENDING_REVIEW,

  LIVE,

  RESERVED,

  SOLD,

  CANCELLED;

  public static final Set<AuctionStatus> PUBLIC = Set.of(LIVE, RESERVED, SOLD, CANCELLED);

  public static final Set<AuctionStatus> COMMITTED = Set.of(RESERVED, SOLD);

  public boolean isPublic() {
    return PUBLIC.contains(this);
  }

  public boolean isCommitted() {
    return COMMITTED.contains(this);
  }

  public boolean isOpen() {
    return this == LIVE || this == RESERVED;
  }
}
