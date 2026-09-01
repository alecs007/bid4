package ro.bid4.backend.security;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import ro.bid4.backend.common.config.Bid4Properties;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.RequestCorrelationFilter;
import ro.bid4.backend.security.jwt.JwtService;
import ro.bid4.backend.security.jwt.TokenVersionValidator;
import ro.bid4.backend.security.ratelimit.RateLimitFilter;
import ro.bid4.backend.security.ratelimit.RateLimiter;

/**
 * The filter chain every request passes before a controller sees it.
 *
 * <p>Deny by default: {@code anyRequest().authenticated()} is the last rule, so a new endpoint is
 * closed until someone opens it deliberately. The alternative — open until secured — fails in the
 * direction that matters.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

  private final Bid4Properties properties;

  public SecurityConfig(Bid4Properties properties) {
    this.properties = properties;
  }

  @Bean
  SecurityFilterChain apiSecurity(HttpSecurity http, RateLimiter rateLimiter) throws Exception {
    http
        // No cookie-backed session exists to forge a request against, and the
        // one cookie there is — the refresh token — is SameSite=Strict and
        // scoped to /auth. See AuthController.
        .csrf(AbstractHttpConfigurer::disable)
        .cors(Customizer.withDefaults())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .headers(
            headers ->
                headers
                    // cacheControl is left as Spring Security configures it: it
                    // stamps no-store on anything that has not set a Cache-Control
                    // of its own, and steps aside for anything that has. That is
                    // what lets PublicCaching opt the browsing endpoints in
                    // without weakening the default for everything else.
                    .frameOptions(frame -> frame.deny())
                    .contentTypeOptions(Customizer.withDefaults())
                    .referrerPolicy(
                        referrer ->
                            referrer.policy(
                                org.springframework.security.web.header.writers
                                    .ReferrerPolicyHeaderWriter.ReferrerPolicy
                                    .STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                    .httpStrictTransportSecurity(
                        hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31_536_000))
                    // This API answers JSON and never HTML, so nothing it returns
                    // should ever be treated as a document with privileges.
                    .contentSecurityPolicy(
                        csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'")))
        .authorizeHttpRequests(
            auth ->
                auth
                    // Actuator answers on the management port, which compose does not
                    // publish, so this is not a public opening. On the API port the
                    // path is not mapped at all and answers 404.
                    //
                    // Matched by path rather than EndpointRequest.toAnyEndpoint(): the
                    // endpoint registry lives in the management child context, so a
                    // matcher built here resolves against the wrong one and never fires.
                    .requestMatchers("/actuator/**")
                    .permitAll()
                    .requestMatchers(
                        "/auth/login",
                        "/auth/register",
                        "/auth/refresh",
                        // Confirming an address is the step that precedes having
                        // an account to authenticate with, so it cannot require one.
                        "/auth/verify",
                        "/auth/resend-verification")
                    .permitAll()
                    // Browsing is the point of the site, so reading the
                    // catalogue never requires an account. GET only: everything
                    // that changes an auction still falls through to the last
                    // rule. A token is read when one is sent — the response
                    // carries more for a signed-in viewer — but its absence is
                    // not an error here.
                    .requestMatchers(HttpMethod.GET, "/auctions", "/auctions/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/causes", "/causes/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/stats/public")
                    .permitAll()
                    // One segment only, so this opens the public profile at
                    // /users/{username} and never /users/me/anything, which
                    // falls through to the last rule and stays authenticated.
                    // "/users" itself is the member search, which is public for
                    // the same reason the profiles it links to are.
                    .requestMatchers(HttpMethod.GET, "/users", "/users/*")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .oauth2ResourceServer(
            oauth2 ->
                oauth2
                    .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthenticationConverter()))
                    .authenticationEntryPoint(
                        (request, response, ex) -> write(response, ErrorCode.UNAUTHENTICATED))
                    .accessDeniedHandler(
                        (request, response, ex) -> write(response, ErrorCode.FORBIDDEN)))
        .exceptionHandling(
            handling ->
                handling
                    .authenticationEntryPoint(
                        (request, response, ex) -> write(response, ErrorCode.UNAUTHENTICATED))
                    .accessDeniedHandler(
                        (request, response, ex) -> write(response, ErrorCode.FORBIDDEN)))
        // After authentication, so a signed-in caller is charged against their
        // own budget rather than sharing one with everyone behind the same address.
        .addFilterAfter(new RateLimitFilter(rateLimiter), BearerTokenAuthenticationFilter.class);

    return http.build();
  }

  /** Maps the {@code role} claim onto a single ROLE_ authority. */
  @Bean
  JwtAuthenticationConverter jwtAuthenticationConverter() {
    JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
    authorities.setAuthorityPrefix("ROLE_");
    authorities.setAuthoritiesClaimName(JwtService.CLAIM_ROLE);

    JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
    converter.setJwtGrantedAuthoritiesConverter(authorities);
    return converter;
  }

  @Bean
  JwtDecoder jwtDecoder(TokenVersionValidator tokenVersion) {
    NimbusJwtDecoder decoder =
        NimbusJwtDecoder.withSecretKey(secretKey()).macAlgorithm(MacAlgorithm.HS256).build();

    // The default validator only checks the clock. Issuer is checked because we
    // set one, and tv because otherwise revoking a session leaves every access
    // token already issued working until it expires on its own.
    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(properties.jwt().issuer()), tokenVersion));
    return decoder;
  }

  @Bean
  JwtEncoder jwtEncoder() {
    return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey()));
  }

  /**
   * BCrypt at cost 12. Roughly a quarter-second per hash on current hardware, which is invisible to
   * one person signing in and ruinous to anyone working through a stolen table.
   */
  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
    // Exact origins, never a wildcard: credentials are allowed on this endpoint
    // so the refresh cookie can travel, and a wildcard with credentials would
    // let any site read authenticated responses.
    config.setAllowedOrigins(properties.cors().allowedOrigins());
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    config.setAllowedHeaders(
        List.of(
            HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE, RequestCorrelationFilter.HEADER));
    config.setExposedHeaders(
        List.of(
            RequestCorrelationFilter.HEADER,
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            HttpHeaders.RETRY_AFTER));
    config.setAllowCredentials(true);
    config.setMaxAge(3600L);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  private SecretKeySpec secretKey() {
    return new SecretKeySpec(
        properties.jwt().secret().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
  }

  /** The same body shape the controllers return, written before MVC is reached. */
  private static void write(HttpServletResponse response, ErrorCode code)
      throws java.io.IOException {
    response.setStatus(code.status().value());
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    response.setCharacterEncoding(StandardCharsets.UTF_8.name());
    response
        .getWriter()
        .write(
            "{\"status\":"
                + code.status().value()
                + ",\"code\":\""
                + code.name()
                + "\",\"message\":\""
                + code.message()
                + "\"}");
  }
}
