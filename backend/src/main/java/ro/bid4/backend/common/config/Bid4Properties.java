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

    /** HS256 needs at least 256 bits of key, and a short one is worse than none. */
    public Jwt {
      if (secret != null && secret.length() < 32) {
        throw new IllegalStateException(
            "bid4.jwt.secret is too short — generate one with: openssl rand -base64 48");
      }
    }
  }

  public record Cors(@NotEmpty List<String> allowedOrigins) {}

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
      @Valid @NotNull Rule write,
      @Valid @NotNull Rule read) {

    public record Rule(@Min(1) long capacity, @NotNull Duration window) {}
  }
}
