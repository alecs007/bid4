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

@Configuration
@EnableMethodSecurity
public class SecurityConfig {
  private final Bid4Properties properties;

  public SecurityConfig(Bid4Properties properties) {
    this.properties = properties;
  }

  @Bean
  SecurityFilterChain apiSecurity(HttpSecurity http, RateLimiter rateLimiter) throws Exception {
    http.csrf(AbstractHttpConfigurer::disable)
        .cors(Customizer.withDefaults())
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .headers(
            headers ->
                headers
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
                    .contentSecurityPolicy(
                        csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'")))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers("/actuator/**")
                    .permitAll()
                    .requestMatchers(
                        "/auth/login",
                        "/auth/register",
                        "/auth/refresh",
                        "/auth/verify",
                        "/auth/resend-verification")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/auctions", "/auctions/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/causes", "/causes/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/stats/public")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/media/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/inbox/stream")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/users", "/users/*")
                    .permitAll()
                    .requestMatchers(HttpMethod.POST, "/webhooks/courier", "/webhooks/payments")
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
        .addFilterAfter(new RateLimitFilter(rateLimiter), BearerTokenAuthenticationFilter.class);

    return http.build();
  }

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

    decoder.setJwtValidator(
        new DelegatingOAuth2TokenValidator<>(
            JwtValidators.createDefaultWithIssuer(properties.jwt().issuer()), tokenVersion));
    return decoder;
  }

  @Bean
  JwtEncoder jwtEncoder() {
    return new NimbusJwtEncoder(new ImmutableSecret<>(secretKey()));
  }

  @Bean
  PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder(12);
  }

  @Bean
  CorsConfigurationSource corsConfigurationSource() {
    CorsConfiguration config = new CorsConfiguration();
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
