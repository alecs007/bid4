package ro.bid4.backend.security.web;

import java.util.Set;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.security.jwt.JwtService;

public final class Viewers {
  private static final Set<String> STAFF_ROLES = Set.of("OPERATOR", "ADMIN");

  private Viewers() {}

  public static Viewer from(Jwt jwt) {
    if (jwt == null) {
      return Viewer.anonymous();
    }

    UUID subject = subjectOf(jwt);
    if (subject == null) {
      return Viewer.anonymous();
    }
    return Viewer.of(subject, STAFF_ROLES.contains(jwt.getClaimAsString(JwtService.CLAIM_ROLE)));
  }

  private static UUID subjectOf(Jwt jwt) {
    try {
      return UUID.fromString(jwt.getSubject());
    } catch (IllegalArgumentException | NullPointerException ex) {
      return null;
    }
  }
}
