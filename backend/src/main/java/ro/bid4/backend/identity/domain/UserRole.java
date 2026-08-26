package ro.bid4.backend.identity.domain;

/** One end-user role, plus two staff roles. ADMIN is a strict superset of OPERATOR. */
public enum UserRole {
  USER,
  OPERATOR,
  ADMIN
}
