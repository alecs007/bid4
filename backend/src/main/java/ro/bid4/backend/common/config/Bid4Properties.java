package ro.bid4.backend.common.config;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.Duration;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Every tunable the application has, in one typed tree.
 *
 * <p>Validated at startup, so a missing secret or a nonsensical window fails the boot with a
 * readable message instead of surfacing as a security hole under load.
 */
@Validated
@ConfigurationProperties(prefix = "bid4")
public record Bid4Properties(
    @Valid @NotNull Jwt jwt,
    @Valid @NotNull Cors cors,
    @Valid @NotNull Cookies cookies,
    @Valid @NotNull Storage storage,
    @Valid @NotNull Security security,
    @Valid @NotNull Mail mail,
    @Valid @NotNull Verification verification,
    @Valid @NotNull RateLimit rateLimit) {

  public record Jwt(
      @NotBlank String secret,
      @NotBlank String issuer,
      @NotNull Duration accessTokenTtl,
      @NotNull Duration refreshTokenTtl) {

    /** A record prints all of its components, and one of these signs every token. */
    @Override
    public String toString() {
      return "Jwt[secret=<redacted>, issuer="
          + issuer
          + ", accessTokenTtl="
          + accessTokenTtl
          + ", refreshTokenTtl="
          + refreshTokenTtl
          + "]";
    }

    /**
     * HS256 needs at least 256 bits of key, and a short one is worse than none.
     *
     * <p>Forty-four characters, not thirty-two: that is what 32 random bytes come to in base64, and
     * the README's {@code openssl rand -base64 48} clears it comfortably. Thirty-two characters is
     * exactly the floor rather than above it, and length is not entropy in any case — a run of the
     * same letter passes this. The generation command is the real control; this only catches a
     * secret nobody thought about.
     */
    public Jwt {
      if (secret != null && secret.length() < 44) {
        throw new IllegalStateException(
            "bid4.jwt.secret is too short — generate one with: openssl rand -base64 48");
      }
    }
  }

  public record Cors(@NotEmpty List<String> allowedOrigins) {}

  /**
   * Whether session cookies must carry Secure regardless of what the request looked like.
   *
   * <p>True everywhere but development. Behind a proxy that terminates TLS the application sees
   * plain HTTP, and inferring the flag from that would ship a thirty-day refresh token without
   * Secure — after which the browser sends it over any plaintext request to the domain. Stating it
   * means a misconfigured proxy cannot quietly downgrade the cookie.
   */
  public record Cookies(boolean requireSecure) {}

  public record Storage(
      @NotBlank String endpoint,
      @NotBlank String accessKey,
      @NotBlank String secretKey,
      @NotBlank String publicBucket,
      @NotBlank String privateBucket,
      @NotNull Duration publicUrlTtl,
      @NotNull Duration privateUrlTtl) {}

  public record Mail(@NotBlank String from, @NotBlank String webBaseUrl) {}

  public record Verification(@NotNull Duration tokenTtl, @NotNull Duration resendCooldown) {}

  public record Security(@Min(1) int maxFailedLogins, @NotNull Duration lockoutDuration) {}

  public record RateLimit(
      boolean enabled,
      @Valid @NotNull Rule auth,
      @Valid @NotNull Rule refresh,
      @Valid @NotNull Rule write,
      @Valid @NotNull Rule read) {

    public record Rule(@Min(1) long capacity, @NotNull Duration window) {}
  }
}
