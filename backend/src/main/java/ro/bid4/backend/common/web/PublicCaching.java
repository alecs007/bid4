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

  /**
   * For a body that is the same whoever asks.
   *
   * <p>{@code Vary: Authorization} even here, and deliberately. Nothing in this body depends on the
   * token, but the same URL served to a signed-in caller may not be: an endpoint that answers
   * shared while signed out and per-viewer while signed in is exactly the shape below, and without
   * the header a shared cache would hand one caller's copy to the other.
   */
  public static <T> ResponseEntity<T> shared(T body) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(SHARED_TTL).cachePublic())
        .header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION)
        .body(body);
  }

  /**
   * Shared while signed out, private while signed in.
   *
   * <p>For a browsing answer that carries a little of the viewer in it — whether they follow a
   * listing, where they stand in the bidding. Signed out there is none of that, the body is the
   * same for every visitor, and it can be held for a minute by any cache between here and them.
   * That is most of the traffic a homepage gets.
   */
  public static <T> ResponseEntity<T> browsing(T body, boolean anonymous) {
    return anonymous ? shared(body) : perViewer(body);
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
