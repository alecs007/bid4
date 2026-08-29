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

/**
 * The endpoints frontend/src/lib/api/auth.ts calls.
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

  /** Carries no token — only that a session exists, and what it may render. */
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

  /**
   * Creates the account and mails a confirmation link.
   *
   * <p>Returns the user and no token. The address has not been proved yet, so there is nothing to
   * sign in to — the caller belongs in their inbox, not in the application.
   */
  @PostMapping("/register")
  ResponseEntity<UserResponse> register(
      @Valid @RequestBody RegisterRequest request, HttpServletRequest http) {
    UserResponse user = authService.register(request, clientIp(http), userAgent(http));
    return ResponseEntity.status(HttpStatus.CREATED).body(user);
  }

  /** Redeems the link from the message. Idempotent: mail clients prefetch links. */
  @PostMapping("/verify")
  ResponseEntity<Void> verify(@Valid @RequestBody VerifyEmailRequest request) {
    emailVerification.confirm(request.token());
    return ResponseEntity.noContent().build();
  }

  /**
   * Sends another link. Answers 204 whether or not the address exists, so this cannot be used to
   * discover who has an account.
   */
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

  /**
   * Trades the refresh cookie for a new pair.
   *
   * <p>A refusal clears both cookies rather than leaving them. The session cookie is httpOnly, so a
   * page cannot tidy it up itself, and one left behind after the refresh token died keeps the
   * frontend middleware redirecting away from the sign-in page — which is the one page somebody in
   * that state needs. The headers are put on the response directly because this exit is an
   * exception, and the error handler writes its body to the same response.
   */
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
        // Strict is what stands in for CSRF protection on /auth/refresh: a POST
        // from another site simply does not carry this cookie. The frontend is
        // same-site with the API, so its own calls are unaffected.
        .sameSite("Strict")
        .path("/auth");
  }

  /**
   * Says that a session exists, and nothing else.
   *
   * <p>The web app needs to know whether to render a signed-in shell before it has asked the API
   * anything — otherwise every protected route flashes its signed-out state first. It used to learn
   * that by reading the access token out of storage, which meant the token had to be somewhere a
   * script could reach.
   *
   * <p>This carries no token. It is the role and nothing more, so the worst a stolen copy achieves
   * is rendering a page whose data the API then refuses. Lax rather than Strict because it has to
   * survive a top-level navigation — being read during navigation is its entire purpose — and it is
   * httpOnly so the page itself cannot read it either.
   */
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

  /**
   * Whether the browser reached us over TLS.
   *
   * <p>{@code request.isSecure()} is false behind a proxy that terminates TLS unless Boot is told
   * to trust the forwarded headers, which it is outside development — see {@code
   * server.forward-headers-strategy}. Inferring this wrongly would ship the refresh token without
   * Secure and let it travel in clear, so development is the only place it is allowed to come out
   * false, and it says so rather than guessing.
   */
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
