package ro.bid4.backend.security.jwt;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import ro.bid4.backend.common.config.Bid4Properties;
import ro.bid4.backend.identity.domain.UserAccount;

/**
 * Issues the two tokens a session is made of.
 *
 * <p>The access token is a signed JWT the client sends on every request; verification is Spring
 * Security's, via Nimbus, so no token parsing is written here. It is deliberately short-lived,
 * because it is the half a page script could read.
 *
 * <p>The refresh token is not a JWT. It is opaque random bytes that mean nothing without the row
 * they hash to, which is what makes revoking one actually revoke it.
 */
@Service
public class JwtService {

  /** Claim carrying the user's role, mapped to an authority by the resource server. */
  public static final String CLAIM_ROLE = "role";

  /** Claim carrying token_version, so a password change can invalidate issued tokens. */
  public static final String CLAIM_TOKEN_VERSION = "tv";

  private static final int REFRESH_TOKEN_BYTES = 32;

  private final JwtEncoder encoder;
  private final Bid4Properties properties;
  private final SecureRandom random = new SecureRandom();

  public JwtService(JwtEncoder encoder, Bid4Properties properties) {
    this.encoder = encoder;
    this.properties = properties;
  }

  public AccessToken issueAccessToken(UserAccount user) {
    Instant now = Instant.now();
    Instant expiresAt = now.plus(properties.jwt().accessTokenTtl());

    JwtClaimsSet claims =
        JwtClaimsSet.builder()
            .issuer(properties.jwt().issuer())
            .issuedAt(now)
            .expiresAt(expiresAt)
            .subject(user.getId().toString())
            .id(UUID.randomUUID().toString())
            .claim(CLAIM_ROLE, user.getRole().name())
            .claim(CLAIM_TOKEN_VERSION, user.getTokenVersion())
            .build();

    String token =
        encoder
            .encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims))
            .getTokenValue();

    return new AccessToken(token, expiresAt);
  }

  /**
   * A fresh refresh token. The caller stores {@link RefreshTokenValue#hash()} and hands {@link
   * RefreshTokenValue#value()} to the browser exactly once.
   */
  public RefreshTokenValue issueRefreshToken() {
    byte[] bytes = new byte[REFRESH_TOKEN_BYTES];
    random.nextBytes(bytes);
    String value = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    return new RefreshTokenValue(value, hash(value));
  }

  /**
   * SHA-256, not bcrypt. The input is 256 bits of entropy we generated, so there is no dictionary
   * to attack and no reason to pay a work factor on every refresh.
   */
  public String hash(String token) {
    try {
      MessageDigest digest = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (java.security.NoSuchAlgorithmException ex) {
      throw new IllegalStateException("SHA-256 is required and was not available", ex);
    }
  }

  public Instant refreshTokenExpiry() {
    return Instant.now().plus(properties.jwt().refreshTokenTtl());
  }

  public record AccessToken(String value, Instant expiresAt) {}

  public record RefreshTokenValue(String value, String hash) {}
}
