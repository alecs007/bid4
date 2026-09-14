package ro.bid4.backend.inbox.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;

public final class Cursors {
  private Cursors() {}

  public static String encode(Instant at, UUID id) {
    String raw = at.toEpochMilli() + ":" + id;
    return Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
  }

  public static Instant instantOf(String cursor) {
    return cursor == null || cursor.isBlank() ? null : decode(cursor).at();
  }

  public static UUID idOf(String cursor) {
    return cursor == null || cursor.isBlank() ? null : decode(cursor).id();
  }

  private record Key(Instant at, UUID id) {}

  private static Key decode(String cursor) {
    try {
      String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
      int split = raw.indexOf(':');
      return new Key(
          Instant.ofEpochMilli(Long.parseLong(raw.substring(0, split))),
          UUID.fromString(raw.substring(split + 1)));
    } catch (RuntimeException malformed) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Paginarea nu este validă.");
    }
  }
}
