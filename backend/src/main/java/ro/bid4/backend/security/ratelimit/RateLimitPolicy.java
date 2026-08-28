package ro.bid4.backend.security.ratelimit;

/**
 * The three budgets a request can be charged against.
 *
 * <p>Separate budgets rather than one, because the traffic differs in kind: browsing is cheap and
 * frequent, writing is neither, and guessing a password should be expensive long before either.
 */
public enum RateLimitPolicy {
  /** Sign-in and registration. Strict, and refuses when Redis is unreachable. */
  AUTH(true),
  /**
   * Trading a refresh token for an access token.
   *
   * <p>Not AUTH, for two reasons. The token is 256 bits of SecureRandom, so there is nothing here
   * to guess and no reason to price it like a password attempt; theft is caught by rotation and
   * reuse detection instead. And the caller is anonymous by definition — the exchange sends no
   * bearer token — so the budget is keyed by address, and a shared office or a carrier NAT would
   * spend one budget between everyone behind it.
   *
   * <p>It also fails open. Access tokens last fifteen minutes; refusing refreshes while Redis is
   * down would sign the entire user base out inside a quarter of an hour, which is a worse outcome
   * than an unmetered window on an operation that cannot be brute-forced.
   */
  REFRESH(false),
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
