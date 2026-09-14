package ro.bid4.backend.identity.api;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.identity.api.dto.AuthSessionResponse;
import ro.bid4.backend.identity.api.dto.LoginRequest;
import ro.bid4.backend.identity.api.dto.RegisterRequest;
import ro.bid4.backend.identity.api.dto.ResendVerificationRequest;
import ro.bid4.backend.identity.api.dto.UserResponse;
import ro.bid4.backend.identity.api.dto.VerifyEmailRequest;
import ro.bid4.backend.identity.service.AuthService;
import ro.bid4.backend.identity.service.EmailVerificationService;

@RestController
@RequestMapping("/auth")
public class AuthController {
  static final String REFRESH_COOKIE = "bid4.refresh";

  static final String SESSION_COOKIE = "bid4.session";

  private final AuthService authService;
  private final EmailVerificationService emailVerification;
  private final Bid4Properties properties;

  public AuthController(
      AuthService authService,
      EmailVerificationService emailVerification,
      Bid4Properties properties) {
    this.authService = authService;
    this.emailVerification = emailVerification;
    this.properties = properties;
  }

  @PostMapping("/register")
  ResponseEntity<UserResponse> register(
      @Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
    UserResponse user = authService.register(request, clientIp(http), userAgent(http));
    return ResponseEntity.status(HttpStatus.CREATED).body(user);
  }

  @PostMapping("/verify")
  ResponseEntity<Void> verify(@Valid @RequestBody VerifyEmailRequest request) {
    emailVerification.confirm(request.token());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/resend-verification")
  ResponseEntity<Void> resendVerification(@Valid @RequestBody ResendVerificationRequest request) {
    emailVerification.resend(request.email());
    return ResponseEntity.noContent().build();
  }

  @PostMapping("/login")
  ResponseEntity<AuthSessionResponse> login(
      @Valid @RequestBody LoginRequest request, HttpServletRequest http) {
    AuthService.SessionResult result = authService.login(request, clientIp(http), userAgent(http));
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken(), http).toString())
        .header(HttpHeaders.SET_COOKIE, sessionCookie(result.session().user(), http).toString())
        .body(result.session());
  }

  @PostMapping("/refresh")
  ResponseEntity<AuthSessionResponse> refresh(
      @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
      HttpServletRequest http,
      HttpServletResponse response) {
    AuthService.SessionResult result;
    try {
      result = authService.refresh(refreshToken, clientIp(http), userAgent(http));
    } catch (ApiException refused) {
      response.addHeader(HttpHeaders.SET_COOKIE, expiredRefreshCookie(http).toString());
      response.addHeader(HttpHeaders.SET_COOKIE, expiredSessionCookie(http).toString());
      throw refused;
    }
    return ResponseEntity.ok()
        .header(HttpHeaders.SET_COOKIE, refreshCookie(result.refreshToken(), http).toString())
        .header(HttpHeaders.SET_COOKIE, sessionCookie(result.session().user(), http).toString())
        .body(result.session());
  }

  @PostMapping("/logout")
  ResponseEntity<Void> logout(
      @CookieValue(name = REFRESH_COOKIE, required = false) String refreshToken,
      HttpServletRequest http) {
    authService.logout(refreshToken);
    return ResponseEntity.noContent()
        .header(HttpHeaders.SET_COOKIE, expiredRefreshCookie(http).toString())
        .header(HttpHeaders.SET_COOKIE, expiredSessionCookie(http).toString())
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
        .secure(isSecure(http))
        .sameSite("Strict")
        .path("/auth");
  }

  private ResponseCookie sessionCookie(UserResponse user, HttpServletRequest http) {
    return sessionCookieBase(user.roleName(), http)
        .maxAge(properties.jwt().refreshTokenTtl())
        .build();
  }

  private ResponseCookie expiredSessionCookie(HttpServletRequest http) {
    return sessionCookieBase("", http).maxAge(Duration.ZERO).build();
  }

  private ResponseCookie.ResponseCookieBuilder sessionCookieBase(
      String value, HttpServletRequest http) {
    return ResponseCookie.from(SESSION_COOKIE, value)
        .httpOnly(true)
        .secure(isSecure(http))
        .sameSite("Lax")
        .path("/");
  }

  private boolean isSecure(HttpServletRequest http) {
    return properties.cookies().requireSecure() || http.isSecure();
  }

  private static String clientIp(HttpServletRequest request) {
    return request.getRemoteAddr();
  }

  private static String userAgent(HttpServletRequest request) {
    return request.getHeader(HttpHeaders.USER_AGENT);
  }
}
