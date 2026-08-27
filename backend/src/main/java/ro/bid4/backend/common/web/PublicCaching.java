package ro.bid4.backend.common.web;

import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

/**
 * How long a browsing answer may be reused before it is asked for again.
 *
 * <p>The homepage is three requests that mostly return what they returned a moment ago, and a
 * visitor who refreshes twice should pay for it once. Fewer queries is the smaller half of that;
 * not making the request at all is the larger one.
 */
public final class PublicCaching {

  /**
   * Identical for everyone, so a shared cache may hold it.
   *
   * <p>The impact counters move when an order settles, which is not something anyone is watching to
   * the second.
   */
  private static final Duration SHARED_TTL = Duration.ofMinutes(1);

  /**
   * Depends on who is asking, so it stays in the one browser that asked.
   *
   * <p>A listing carries whether the viewer follows it and where they stand in the bidding, and a
   * shared cache handing that to the next person is an account leak, not a performance win. Short,
   * because a price that is half a minute stale on a page about bidding is a lie — fifteen seconds
   * covers a refresh without covering a bid.
   */
  private static final Duration PRIVATE_TTL = Duration.ofSeconds(15);

  private PublicCaching() {}

  /** For a body that is the same whoever asks. */
  public static <T> ResponseEntity<T> shared(T body) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(SHARED_TTL).cachePublic())
        .body(body);
  }

  /**
   * For a body that is shaped by the token that fetched it.
   *
   * <p>{@code Vary: Authorization} is what stops a cache from answering a signed-in request with
   * the anonymous copy it stored earlier, or the reverse.
   */
  public static <T> ResponseEntity<T> perViewer(T body) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(PRIVATE_TTL).cachePrivate())
        .header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION)
        .body(body);
  }
}
