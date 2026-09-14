package ro.bid4.backend.common.web;

import java.time.Duration;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;

public final class PublicCaching {
  private static final Duration SHARED_TTL = Duration.ofMinutes(1);

  private static final Duration PRIVATE_TTL = Duration.ofSeconds(15);

  private PublicCaching() {}

  public static <T> ResponseEntity<T> shared(T body) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(SHARED_TTL).cachePublic())
        .header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION)
        .body(body);
  }

  public static <T> ResponseEntity<T> browsing(T body, boolean anonymous) {
    return anonymous ? shared(body) : perViewer(body);
  }

  public static <T> ResponseEntity<T> perViewer(T body) {
    return ResponseEntity.ok()
        .cacheControl(CacheControl.maxAge(PRIVATE_TTL).cachePrivate())
        .header(HttpHeaders.VARY, HttpHeaders.AUTHORIZATION)
        .body(body);
  }
}
