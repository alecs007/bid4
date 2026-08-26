package ro.bid4.backend.cause.domain;

/** How far the identity and document check has got. */
public enum VerificationStatus {
  UNVERIFIED,
  PENDING_APPROVAL,
  APPROVED,
  REJECTED
}
