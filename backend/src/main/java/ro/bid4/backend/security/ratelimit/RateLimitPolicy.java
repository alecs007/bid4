package ro.bid4.backend.security.ratelimit;

public enum RateLimitPolicy {
  AUTH(true),
  REFRESH(false),
  WRITE(false),
  READ(false);

  private final boolean failClosed;

  RateLimitPolicy(boolean failClosed) {
    this.failClosed = failClosed;
  }

  public boolean failClosed() {
    return failClosed;
  }
}
