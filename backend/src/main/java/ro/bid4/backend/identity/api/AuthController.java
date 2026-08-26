package ro.bid4.backend.identity.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Duration;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.common.config.Bid4Properties;
import ro.bid4.backend.identity.api.dto.AuthSessionResponse;
import ro.bid4.backend.identity.api.dto.LoginRequest;
import ro.bid4.backend.identity.api.dto.RegisterRequest;
import ro.bid4.backend.identity.api.dto.UserResponse;
import ro.bid4.backend.identity.service.AuthService;

/**
 * The four endpoints frontend/src/lib/api/auth.ts calls.
 *
 * <p>The access token is returned in the body, because that is what the frontend puts in the
 * Authorization header. The refresh token never appears in a body: it is set as an httpOnly cookie,
 * so a script that manages to run on the page can borrow the short-lived token but cannot take the
 * long-lived one with it.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

  static final String REFRESH_COOKIE = "bid4.refresh";

  private final AuthService authService;
  private final Bid4Properties properties;

  public AuthController(AuthService authService, Bid4Properties properties) {
    this.authService = authService;
    this.properties = properties;
  }

  @PostMapping("/register")
  ResponseEntity<AuthSessionResponse> register(
      @Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
    AuthService.SessionResult result =
        authService.register(request, clientIp(http), userAgent(http));
    return ResponseEntity.status(HttpStatus.CREATED)
        .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken(), http).toString())
        .body(result.session());
  }

  @PostMapping("/login")
  ResponseEntity<AuthSessionResponse> login(
      @Valid @RequestBody LoginRequest request, HttpServletRequest http) {
    AuthService.SessionResult result = authService.login(request, clientIp(http), userAgent(http));
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken(), http).toString())
        .body(result.session());
  }

  @PostMapping("/refresh")
  ResponseEntity<AuthSessionResponse> refresh(
      @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
      HttpServletRequest http) {
    AuthService.SessionResult result =
        authService.refresh(refreshToken, clientIp(http), userAgent(http));
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken(), http).toString())
        .body(result.session());
  }

  @PostMapping("/logout")
  ResponseEntity<Void> logout(
      @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
      HttpServletRequest http) {
    authService.logout(refreshToken);
    return ResponseEntity.noContent()
        .header(HttpHeaders.SET_COOKIE, expiredRefreshCookie(http).toString())
        .build();
  }

  @GetMapping("/me")
  UserResponse me(@AuthenticationPrincipal Jwt jwt) {
    return authService.currentUser(UUID.fromString(jwt.getSubject()));
  }

  private ResponseCookie refreshCookie(String value, HttpServletRequest http) {
    return baseCookie(value, http).maxAge(properties.jwt().refreshTokenTtl()).build();
  }

  private ResponseCookie expiredRefreshCookie(HttpServletRequest http) {
    return baseCookie("", http).maxAge(Duration.ZERO).build();
  }

  private ResponseCookie.ResponseCookieBuilder baseCookie(String value, HttpServletRequest http) {
    return ResponseCookie.from(REFRESH_COOKIE, value)
        .httpOnly(true)
        // Set only over TLS, and therefore not over plain http in development —
        // where the browser would refuse the cookie outright.
        .secure(http.isSecure())
        // Strict is what stands in for CSRF protection on /auth/refresh: a POST
        // from another site simply does not carry this cookie. The frontend is
        // same-site with the API, so its own calls are unaffected.
        .sameSite("Strict")
        .path(http.getContextPath() + "/auth");
  }

  private static String clientIp(HttpServletRequest request) {
    return request.getRemoteAddr();
  }

  private static String userAgent(HttpServletRequest request) {
    return request.getHeader(HttpHeaders.USER_AGENT);
  }
}
