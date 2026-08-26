package ro.bid4.backend.security.ratelimit;

/**
 * The three budgets a request can be charged against.
 *
 * <p>Separate budgets rather than one, because the traffic differs in kind: browsing is cheap and
 * frequent, writing is neither, and guessing a password should be expensive long before either.
 */
public enum RateLimitPolicy {
  /** Sign-in, registration and refresh. Strict, and refuses when Redis is unreachable. */
  AUTH(true),
  /** Anything that changes state. */
  WRITE(false),
  /** Reads. Generous, and lets traffic through if Redis is unreachable. */
  READ(false);

  private final boolean failClosed;

  RateLimitPolicy(boolean failClosed) {
    this.failClosed = failClosed;
  }

  /**
   * What to do when the limiter itself fails.
   *
   * <p>A Redis outage must not take the site down, so reads and writes are let through. It must
   * also not become an unlimited window for guessing passwords, so authentication is refused.
   * Availability is worth more than the limit in one case and less in the other.
   */
  public boolean failClosed() {
    return failClosed;
  }
}
