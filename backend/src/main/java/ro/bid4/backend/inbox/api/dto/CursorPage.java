package ro.bid4.backend.inbox.api.dto;

import java.util.List;

/**
 * A keyset page.
 *
 * <p>Not {@code PageResponse}: there is no page number and no total. Both are meaningless on a list
 * that is appended to while it is being read, and counting the total would cost more than the page
 * itself.
 */
public record CursorPage<T>(List<T> items, String nextCursor) {

  public static <T> CursorPage<T> of(List<T> items, String nextCursor) {
    return new CursorPage<>(items, nextCursor);
  }
}
