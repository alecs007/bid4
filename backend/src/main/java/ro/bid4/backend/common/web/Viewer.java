package ro.bid4.backend.common.web;

import java.util.UUID;

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
