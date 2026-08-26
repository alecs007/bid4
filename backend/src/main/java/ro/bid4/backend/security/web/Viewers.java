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
    return Viewer.of(
        UUID.fromString(jwt.getSubject()),
        STAFF_ROLES.contains(jwt.getClaimAsString(JwtService.CLAIM_ROLE)));
  }
}
