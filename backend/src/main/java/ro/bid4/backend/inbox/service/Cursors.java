package ro.bid4.backend.inbox.service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;

/**
 * Where a page stopped, as one opaque string.
 *
 * <p>Every list in the inbox is keyset-paged — a thread and an inbox are both appended to while
 * they are being read, so a page number drifts under the reader and an offset gets more expensive
 * the further back they go. What a cursor has to carry is the sort key of the last row seen:
 * timestamp first, id to break a tie between two rows written in the same instant.
 *
 * <p>Base64 rather than the two values in the query string, so it reads as a token to be handed
 * back rather than as two numbers to be edited. It is not a secret and nothing is authorised by it:
 * a caller who changes it sees a different page of what they were already allowed to see.
 */
public final class Cursors {

  private Cursors() {}

  public static String encode(Instant at, UUID id) {
    String raw = at.toEpochMilli() + ":" + id;
    return Base64.getUrlEncoder()
        .withoutPadding()
        .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
  }

  /** The instant half, or null for the first page. */
  public static Instant instantOf(String cursor) {
    return cursor == null || cursor.isBlank() ? null : decode(cursor).at();
  }

  /** The id half, or null for the first page. */
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
      // A cursor is ours or it is nothing. Answering the first page instead
      // would quietly restart a scroll somebody was in the middle of.
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Paginarea nu este validă.");
    }
  }
}
