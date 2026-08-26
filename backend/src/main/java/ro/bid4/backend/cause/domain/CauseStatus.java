package ro.bid4.backend.cause.domain;

import java.util.Set;

/**
 * Mirrors CauseStatus in frontend/src/lib/types/cause.ts.
 *
 * <p>DRAFT — the organiser is still writing it. PENDING_APPROVAL — submitted, waiting in the
 * operator queue. APPROVED — staff said yes. REJECTED — staff said no, with a reason. ACTIVE —
 * public and receiving donations. SUSPENDED — pulled from public view by staff.
 */
public enum CauseStatus {
  DRAFT,
  PENDING_APPROVAL,
  APPROVED,
  REJECTED,
  ACTIVE,
  SUSPENDED;

  /** The two a listing may donate to, and the only two that appear publicly. */
  public static final Set<CauseStatus> PUBLIC = Set.of(APPROVED, ACTIVE);

  public boolean isPublic() {
    return PUBLIC.contains(this);
  }
}
