package ro.bid4.backend.security.ratelimit;

/** The outcome of charging one request, and everything the response headers need. */
public record RateLimitDecision(
    boolean allowed, long limit, long remaining, long retryAfterSeconds) {

  static RateLimitDecision allowed(long limit, long remaining) {
    return new RateLimitDecision(true, limit, Math.max(remaining, 0), 0);
  }

  static RateLimitDecision refused(long limit, long retryAfterSeconds) {
    return new RateLimitDecision(false, limit, 0, Math.max(retryAfterSeconds, 1));
  }
}
