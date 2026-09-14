package ro.bid4.backend.ledger.domain;

public enum AccountKind {
  USER_AVAILABLE,
  CAUSE_AVAILABLE,
  PLATFORM_ESCROW,
  PLATFORM_REVENUE,
  PLATFORM_SHIPPING,
  EXTERNAL;

  public boolean isOwned() {
    return this == USER_AVAILABLE || this == CAUSE_AVAILABLE;
  }
}
