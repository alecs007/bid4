package ro.bid4.backend.common.web;

import java.util.UUID;

/**
 * Who is asking, as far as a read cares.
 *
 * <p>Public reads answer for signed-in and anonymous callers alike, and the difference is never
 * whether the endpoint responds — only what it may include and what it may show. Carrying that as
 * one value keeps every read from taking a nullable id and a loose boolean side by side, and makes
 * the anonymous case something a caller has to name.
 */
public record Viewer(UUID id, boolean staff) {

  private static final Viewer ANONYMOUS = new Viewer(null, false);

  public static Viewer anonymous() {
    return ANONYMOUS;
  }

  public static Viewer of(UUID id, boolean staff) {
    return id == null ? ANONYMOUS : new Viewer(id, staff);
  }

  public boolean isAnonymous() {
    return id == null;
  }

  public boolean is(UUID userId) {
    return id != null && id.equals(userId);
  }
}
