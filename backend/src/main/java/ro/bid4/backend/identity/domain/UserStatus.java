package ro.bid4.backend.identity.domain;

/** A suspended account may still authenticate but may not act. */
public enum UserStatus {
  ACTIVE,
  SUSPENDED
}
