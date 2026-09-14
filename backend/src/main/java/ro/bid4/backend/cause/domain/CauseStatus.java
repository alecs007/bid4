package ro.bid4.backend.cause.domain;

import java.util.Set;

public enum CauseStatus {
  DRAFT,
  PENDING_APPROVAL,
  APPROVED,
  REJECTED,
  ACTIVE,
  SUSPENDED;

  public static final Set<CauseStatus> PUBLIC = Set.of(APPROVED, ACTIVE);

  public boolean isPublic() {
    return PUBLIC.contains(this);
  }
}
