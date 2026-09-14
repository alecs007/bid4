package ro.bid4.backend.inbox.api.dto;

import java.util.List;

public record CursorPage<T>(List<T> items, String nextCursor) {
  public static <T> CursorPage<T> of(List<T> items, String nextCursor) {
    return new CursorPage<>(items, nextCursor);
  }
}
