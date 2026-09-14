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
import ro.bid4.backend.common.audit.AuditLog;
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

@Service
public class AuthService {
  private static final Logger log = LoggerFactory.getLogger(AuthService.class);

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
  private final AuditLog auditLog;
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
      AuditLog auditLog,
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
    this.auditLog = auditLog;
    this.properties = properties;
  }

  @Transactional
  public UserResponse register(RegisterRequest request, String ip, String userAgent) {
    if (!request.acceptedTerms()) {
      throw new ApiException(ErrorCode.TERMS_REQUIRED);
    }

    String email = normaliseEmail(request.email());
    if (users.existsByEmail(email)) {
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
    return startSession(user, ip, userAgent, now);
  }

  @Transactional(noRollbackFor = ApiException.class)
  public SessionResult refresh(String presented, String ip, String userAgent) {
    if (presented == null || presented.isBlank()) {
      throw new ApiException(ErrorCode.INVALID_TOKEN);
    }

    RefreshToken stored =
        refreshTokens
            .findByTokenHashForUpdate(jwtService.hash(presented))
            .orElseThrow(() -> new ApiException(ErrorCode.INVALID_TOKEN));

    Instant now = Instant.now();
    if (stored.getRotatedTo() != null) {
      UUID victim = stored.getUser().getId();
      log.warn("Refresh token reuse detected for user {}", victim);
      auditLog.record(
          AuditLog.REFRESH_TOKEN_REUSE, victim, ip, AuditLog.REFRESH_TOKEN, stored.getId());
      refreshTokens.revokeAllForUser(victim, now);
      throw new ApiException(ErrorCode.INVALID_TOKEN);
    }
    if (!stored.isUsable(now)) {
      throw new ApiException(ErrorCode.INVALID_TOKEN);
    }
    if (stored.familyExpired(now, properties.jwt().absoluteRefreshTtl())) {
      stored.setRevokedAt(now);
      throw new ApiException(ErrorCode.INVALID_TOKEN);
    }

    UserAccount user = stored.getUser();
    if (user.getStatus() == UserStatus.SUSPENDED) {
      throw new ApiException(ErrorCode.ACCOUNT_SUSPENDED);
    }
    if (!user.isEmailVerified()) {
      throw new ApiException(ErrorCode.EMAIL_NOT_VERIFIED);
    }

    SessionResult session = startSession(user, ip, userAgent, stored.getFamilyStartedAt());
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

  private SessionResult startSession(
      UserAccount user, String ip, String userAgent, Instant familyStartedAt) {
    JwtService.AccessToken access = jwtService.issueAccessToken(user);
    JwtService.RefreshTokenValue refresh = jwtService.issueRefreshToken();

    RefreshToken token = new RefreshToken();
    token.setUser(user);
    token.setTokenHash(refresh.hash());
    token.setFamilyStartedAt(familyStartedAt);
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

  public record SessionResult(
      AuthSessionResponse session, String refreshToken, UUID refreshTokenId) {}
}
