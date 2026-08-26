package ro.bid4.backend.identity.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.common.config.Bid4Properties;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.identity.domain.EmailVerificationToken;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.repo.EmailVerificationTokenRepository;
import ro.bid4.backend.identity.repo.UserAccountRepository;
import ro.bid4.backend.security.jwt.JwtService;

/** Issues and redeems the link that proves an address belongs to whoever typed it. */
@Service
public class EmailVerificationService {

  private static final int TOKEN_BYTES = 32;

  private final EmailVerificationTokenRepository tokens;
  private final UserAccountRepository users;
  private final VerificationMailer mailer;
  private final JwtService jwtService;
  private final Bid4Properties properties;
  private final SecureRandom random = new SecureRandom();

  public EmailVerificationService(
      EmailVerificationTokenRepository tokens,
      UserAccountRepository users,
      VerificationMailer mailer,
      JwtService jwtService,
      Bid4Properties properties) {
    this.tokens = tokens;
    this.users = users;
    this.mailer = mailer;
    this.jwtService = jwtService;
    this.properties = properties;
  }

  /** Retires any earlier link, stores the new one as a hash, and mails the raw value. */
  @Transactional
  public void issue(UserAccount user) {
    Instant now = Instant.now();
    tokens.consumeAllForUser(user.getId(), now);

    byte[] bytes = new byte[TOKEN_BYTES];
    random.nextBytes(bytes);
    String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

    EmailVerificationToken token = new EmailVerificationToken();
    token.setUser(user);
    token.setTokenHash(jwtService.hash(raw));
    token.setEmail(user.getEmail());
    token.setExpiresAt(now.plus(properties.verification().tokenTtl()));
    tokens.save(token);

    mailer.sendVerification(user.getEmail(), user.getDisplayName(), raw);
  }

  /**
   * Redeems a link.
   *
   * <p>Idempotent by design: confirming an address that is already confirmed succeeds quietly. Mail
   * clients prefetch links, so the same token can legitimately arrive twice, and a second visit
   * showing an error would read as a broken link.
   */
  @Transactional
  public void confirm(String rawToken) {
    if (rawToken == null || rawToken.isBlank()) {
      throw new ApiException(ErrorCode.VERIFICATION_LINK_INVALID);
    }

    EmailVerificationToken token =
        tokens
            .findByTokenHash(jwtService.hash(rawToken))
            .orElseThrow(() -> new ApiException(ErrorCode.VERIFICATION_LINK_INVALID));

    UserAccount user = token.getUser();
    Instant now = Instant.now();

    if (user.isEmailVerified() && token.getEmail().equals(user.getEmail())) {
      return;
    }
    if (!token.isUsable(now)) {
      throw new ApiException(ErrorCode.VERIFICATION_LINK_INVALID);
    }
    // The address moved after the link was sent, so this link proves nothing
    // about the address the account now carries.
    if (!token.getEmail().equals(user.getEmail())) {
      throw new ApiException(ErrorCode.VERIFICATION_LINK_INVALID);
    }

    token.setConsumedAt(now);
    user.setEmailVerifiedAt(now);
  }

  /**
   * Sends another link.
   *
   * <p>Answers the same way whether or not the address exists — asking to resend must not become a
   * way to discover who has an account. The cooldown is what stops it becoming a way to send mail
   * to someone else repeatedly.
   */
  @Transactional
  public void resend(String rawEmail) {
    String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase(java.util.Locale.ROOT);
    Optional<UserAccount> found = users.findByEmail(email);
    if (found.isEmpty()) {
      return;
    }

    UserAccount user = found.get();
    if (user.isEmailVerified()) {
      return;
    }

    Instant cutoff = Instant.now().minus(properties.verification().resendCooldown());
    boolean tooSoon =
        tokens
            .findFirstByUserIdOrderByCreatedAtDesc(user.getId())
            .map(latest -> latest.getCreatedAt().isAfter(cutoff))
            .orElse(false);
    if (tooSoon) {
      throw new ApiException(ErrorCode.VERIFICATION_RESEND_TOO_SOON);
    }

    issue(user);
  }
}
