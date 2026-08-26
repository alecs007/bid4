package ro.bid4.backend.identity.service;

import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.common.config.Bid4Properties;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.text.TextSanitizer;
import ro.bid4.backend.identity.api.dto.AuthSessionResponse;
import ro.bid4.backend.identity.api.dto.LoginRequest;
import ro.bid4.backend.identity.api.dto.RegisterRequest;
import ro.bid4.backend.identity.api.dto.UserResponse;
import ro.bid4.backend.identity.domain.LoginAttempt;
import ro.bid4.backend.identity.domain.RefreshToken;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.domain.UserStatus;
import ro.bid4.backend.identity.repo.LoginAttemptRepository;
import ro.bid4.backend.identity.repo.RefreshTokenRepository;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.security.jwt.JwtService;

/** Registration, sign-in, rotation and sign-out. */
@Service
public class AuthService {

  private static final Logger log = LoggerFactory.getLogger(AuthService.class);

  /**
   * A real bcrypt hash of a value nobody knows, verified against when the address does not exist.
   * Without it, "no such account" returns in a millisecond and "wrong password" in a quarter of a
   * second, and that difference is a working account-enumeration oracle.
   */
  private static final String ABSENT_USER_HASH =
      "$2a$12$C6UzMDM.H6dfI/f/IKcEe.3Yz2Bz0lE8LM7qF0GDaEcJqSJ2yWZ8W";

  private final UserAccountRepository users;
  private final RefreshTokenRepository refreshTokens;
  private final LoginAttemptRepository loginAttempts;
  private final PasswordEncoder passwordEncoder;
  private final JwtService jwtService;
  private final UserMapper userMapper;
  private final UsernameFactory usernameFactory;
  private final TextSanitizer sanitizer;
  private final EmailVerificationService emailVerification;
  private final Bid4Properties properties;

  public AuthService(
      UserAccountRepository users,
      RefreshTokenRepository refreshTokens,
      LoginAttemptRepository loginAttempts,
      PasswordEncoder passwordEncoder,
      JwtService jwtService,
      UserMapper userMapper,
      UsernameFactory usernameFactory,
      TextSanitizer sanitizer,
      EmailVerificationService emailVerification,
      Bid4Properties properties) {
    this.users = users;
    this.refreshTokens = refreshTokens;
    this.loginAttempts = loginAttempts;
    this.passwordEncoder = passwordEncoder;
    this.jwtService = jwtService;
    this.userMapper = userMapper;
    this.usernameFactory = usernameFactory;
    this.sanitizer = sanitizer;
    this.emailVerification = emailVerification;
    this.properties = properties;
  }

  /**
   * Creates the account and mails a confirmation link. Deliberately returns no session: an address
   * nobody has proved they own must not become a usable account, so the caller is sent to their
   * inbox rather than into the application.
   */
  @Transactional
  public UserResponse register(RegisterRequest request, String ip, String userAgent) {
    if (!request.acceptedTerms()) {
      throw new ApiException(ErrorCode.TERMS_REQUIRED);
    }

    String email = normaliseEmail(request.email());
    if (users.existsByEmail(email)) {
      // This does tell a caller that an address is registered. Registration
      // cannot avoid saying so and still be usable; the AUTH rate limit is what
      // keeps it from becoming a way to enumerate the user table.
      throw new ApiException(ErrorCode.EMAIL_TAKEN);
    }

    String displayName = sanitizer.plain(request.displayName());
    if (displayName == null || displayName.length() < 2) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Completează numele afișat.");
    }

    UserAccount user = new UserAccount();
    user.setEmail(email);
    user.setPasswordHash(passwordEncoder.encode(request.password()));
    user.setDisplayName(displayName);
    user.setUsername(usernameFactory.uniqueFrom(displayName));
    user.setRole(UserRole.USER);
    user.setAccountType(request.accountType());
    user.setStatus(UserStatus.ACTIVE);
    user.setOrgLegalName(sanitizer.plain(request.orgLegalName()));
    user.setOrgRegistrationNumber(sanitizer.plain(request.orgRegistrationNumber()));

    UserAccount saved = users.save(user);
    loginAttempts.save(LoginAttempt.of(email, saved.getId(), ip, userAgent, true, "REGISTERED"));
    emailVerification.issue(saved);
    return userMapper.toResponse(saved);
  }

  /**
   * noRollbackFor is load-bearing, not decoration. A failed sign-in throws, and a throw would
   * otherwise roll back the two things that must survive it: the incremented failure count and the
   * login_attempts row. Without this the counter resets on every attempt, the lockout never fires,
   * and the audit trail records only successes.
   */
  @Transactional(noRollbackFor = ApiException.class)
  public SessionResult login(LoginRequest request, String ip, String userAgent) {
    String email = normaliseEmail(request.email());
    Optional<UserAccount> found = users.findByEmail(email);

    if (found.isEmpty()) {
      passwordEncoder.matches(request.password(), ABSENT_USER_HASH);
      record(email, null, ip, userAgent, false, "NO_SUCH_USER");
      throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
    }

    UserAccount user = found.get();
    Instant now = Instant.now();

    if (user.isLocked(now)) {
      record(email, user.getId(), ip, userAgent, false, "LOCKED");
      throw new ApiException(ErrorCode.ACCOUNT_LOCKED);
    }

    // An account created through a provider has no password. Verifying against
    // the absent-user hash keeps the timing identical to a wrong password.
    if (!user.hasPassword()) {
      passwordEncoder.matches(request.password(), ABSENT_USER_HASH);
      record(email, user.getId(), ip, userAgent, false, "NO_PASSWORD");
      throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
    }

    if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
      registerFailure(user, now);
      record(email, user.getId(), ip, userAgent, false, "BAD_PASSWORD");
      throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
    }

    // Both checks come after the password for the same reason: answering
    // "suspended" or "unconfirmed" to a wrong password would confirm the address
    // to someone who does not have it.
    if (user.getStatus() == UserStatus.SUSPENDED) {
      record(email, user.getId(), ip, userAgent, false, "SUSPENDED");
      throw new ApiException(ErrorCode.ACCOUNT_SUSPENDED);
    }

    if (!user.isEmailVerified()) {
      record(email, user.getId(), ip, userAgent, false, "UNVERIFIED");
      throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
    }

    user.setFailedLoginCount(0);
    user.setLockedUntil(null);
    user.setLastLoginAt(now);
    record(email, user.getId(), ip, userAgent, true, null);
    return startSession(user, ip, userAgent);
  }

  /**
   * Exchanges a refresh token for a new pair, and invalidates the one presented.
   *
   * <p>A token that was already exchanged means a copy is loose: the honest client and the thief
   * both hold one, and there is no way to tell which just called. Every token for that user is
   * revoked, which ends both sessions and forces a real sign-in.
   */
  @Transactional(noRollbackFor = ApiException.class)
  public SessionResult refresh(String presented, String ip, String userAgent) {
    if (presented == null || presented.isBlank()) {
      throw new ApiException(ErrorCode.INVALID_TOKEN);
    }

    RefreshToken stored =
        refreshTokens
            .findByTokenHash(jwtService.hash(presented))
            .orElseThrow(() -> new ApiException(ErrorCode.INVALID_TOKEN));

    Instant now = Instant.now();
    if (stored.getRotatedTo() != null) {
      log.warn("Refresh token reuse detected for user {}", stored.getUser().getId());
      refreshTokens.revokeAllForUser(stored.getUser().getId(), now);
      throw new ApiException(ErrorCode.INVALID_TOKEN);
    }
    if (!stored.isUsable(now)) {
      throw new ApiException(ErrorCode.INVALID_TOKEN);
    }

    UserAccount user = stored.getUser();
    if (user.getStatus() == UserStatus.SUSPENDED) {
      throw new ApiException(ErrorCode.ACCOUNT_SUSPENDED);
    }
    if (!user.isEmailVerified()) {
      throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
    }

    SessionResult session = startSession(user, ip, userAgent);
    stored.setRotatedTo(session.refreshTokenId());
    stored.setRevokedAt(now);
    return session;
  }

  @Transactional
  public void logout(String presented) {
    if (presented == null || presented.isBlank()) {
      return;
    }
    refreshTokens
        .findByTokenHash(jwtService.hash(presented))
        .ifPresent(token -> token.setRevokedAt(Instant.now()));
  }

  @Transactional(readOnly = true)
  public UserResponse currentUser(UUID userId) {
    return users
        .findById(userId)
        .map(userMapper::toResponse)
        .orElseThrow(() -> new ApiException(ErrorCode.INVALID_TOKEN));
  }

  private SessionResult startSession(UserAccount user, String ip, String userAgent) {
    JwtService.AccessToken access = jwtService.issueAccessToken(user);
    JwtService.RefreshTokenValue refresh = jwtService.issueRefreshToken();

    RefreshToken token = new RefreshToken();
    token.setUser(user);
    token.setTokenHash(refresh.hash());
    token.setExpiresAt(jwtService.refreshTokenExpiry());
    token.setUserAgent(truncate(userAgent, 255));
    token.setIp(ip);
    RefreshToken savedToken = refreshTokens.save(token);

    return new SessionResult(
        new AuthSessionResponse(userMapper.toResponse(user), access.value(), access.expiresAt()),
        refresh.value(),
        savedToken.getId());
  }

  private void registerFailure(UserAccount user, Instant now) {
    int failures = user.getFailedLoginCount() + 1;
    user.setFailedLoginCount(failures);
    if (failures >= properties.security().maxFailedLogins()) {
      user.setLockedUntil(now.plus(properties.security().lockoutDuration()));
      user.setFailedLoginCount(0);
    }
  }

  private void record(
      String email, UUID userId, String ip, String userAgent, boolean ok, String reason) {
    loginAttempts.save(LoginAttempt.of(email, userId, ip, truncate(userAgent, 255), ok, reason));
  }

  private static String normaliseEmail(String raw) {
    return raw == null ? "" : raw.trim().toLowerCase(Locale.ROOT);
  }

  private static String truncate(String value, int max) {
    if (value == null) {
      return null;
    }
    return value.length() <= max ? value : value.substring(0, max);
  }

  /** The session plus the refresh token, which only the controller may see. */
  public record SessionResult(
      AuthSessionResponse session, String refreshToken, UUID refreshTokenId) {}
}
