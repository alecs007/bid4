package ro.bid4.backend.common.web;

/**
 * Where the rate limiter leaves what it worked out about the caller.
 *
 * <p>The limiter already has to decide who is asking — a user id once authenticated, an address
 * before that — and a request attribute is the cheapest way for anything later in the request to
 * reuse that answer instead of computing its own and disagreeing.
 */
public final class RateLimitAttributes {

  /** {@code user:<uuid>} for a signed-in caller, {@code ip:<address>} otherwise. */
  public static final String CALLER = "bid4.caller";

  private RateLimitAttributes() {}
}
