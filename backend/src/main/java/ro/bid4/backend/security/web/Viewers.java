package ro.bid4.backend.security.web;

import java.util.Set;
import java.util.UUID;
import org.springframework.security.oauth2.jwt.Jwt;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.security.jwt.JwtService;

/**
 * Turns the token, or its absence, into a {@link Viewer}.
 *
 * <p>One place, because every public read needs it and each controller writing its own is how two
 * of them end up disagreeing about which roles count as staff.
 */
public final class Viewers {

  /** ADMIN is a strict superset of OPERATOR; both see what an ordinary account cannot. */
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

  /**
   * The subject, or null if it is not one we issued.
   *
   * <p>Every token this application signs carries a uuid here, so this should never fire. It is
   * still not allowed to throw: these are public browsing routes, and a signature that verified
   * against a subject we cannot parse should read as nobody rather than as a 500 that tells whoever
   * sent it they found an edge.
   */
  private static UUID subjectOf(Jwt jwt) {
    try {
      return UUID.fromString(jwt.getSubject());
    } catch (IllegalArgumentException | NullPointerException ex) {
      return null;
    }
  }
}
