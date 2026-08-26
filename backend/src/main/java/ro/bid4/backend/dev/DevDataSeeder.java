package ro.bid4.backend.dev;

import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.domain.UserAccount;
import ro.bid4.backend.identity.domain.UserRole;
import ro.bid4.backend.identity.repo.UserAccountRepository;

/**
 * The accounts a developer needs to have anything to log in as.
 *
 * <p>They mirror the four the frontend's mock world already uses, down to the address and password,
 * so the two halves describe the same people and a screen behaves the same whichever it is talking
 * to.
 *
 * <p>Guarded three ways, because this creates accounts with a password that is printed in a README:
 * it needs {@code bid4.dev.seed=true}, which only the {@code dev} profile sets and nothing else
 * turns on by accident; and it refuses to touch a database that already holds users, so it can
 * never add a known password to a real one.
 */
@Component
@ConditionalOnProperty(name = "bid4.dev.seed", havingValue = "true")
public class DevDataSeeder implements ApplicationRunner {

  private static final Logger log = LoggerFactory.getLogger(DevDataSeeder.class);

  /** Matches DEMO_PASSWORD in the frontend's mock seed. */
  private static final String DEMO_PASSWORD = "bid4demo";

  private final UserAccountRepository users;
  private final PasswordEncoder passwordEncoder;

  public DevDataSeeder(UserAccountRepository users, PasswordEncoder passwordEncoder) {
    this.users = users;
    this.passwordEncoder = passwordEncoder;
  }

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    long existing = users.count();
    if (existing > 0) {
      log.info("Development seed skipped: {} accounts already exist", existing);
      return;
    }

    // Hashed once. BCrypt at cost 12 four times over is a second of startup
    // that nobody needs to pay per account.
    String hash = passwordEncoder.encode(DEMO_PASSWORD);
    Instant now = Instant.now();

    List<UserAccount> seeded =
        List.of(
            account(
                hash,
                now,
                "maria@bid4.ro",
                "Maria Ionescu",
                "maria-ionescu",
                UserRole.USER,
                AccountType.INDIVIDUAL,
                null),
            account(
                hash,
                now,
                "contact@zambet.ro",
                "Asociația Zâmbet pentru Mâine",
                "zambet-pentru-maine",
                UserRole.USER,
                AccountType.ORGANIZATION,
                "Asociația Zâmbet pentru Mâine"),
            account(
                hash,
                now,
                "operator@bid4.ro",
                "Andrei Marinescu",
                "andrei-operator",
                UserRole.OPERATOR,
                AccountType.INDIVIDUAL,
                null),
            account(
                hash,
                now,
                "admin@bid4.ro",
                "Cristina Dobre",
                "cristina-admin",
                UserRole.ADMIN,
                AccountType.INDIVIDUAL,
                null));

    users.saveAll(seeded);
    log.warn(
        "Development seed: created {} accounts, all with the password '{}'. "
            + "This runs only under the dev profile and only into an empty database.",
        seeded.size(),
        DEMO_PASSWORD);
  }

  private static UserAccount account(
      String passwordHash,
      Instant now,
      String email,
      String displayName,
      String username,
      UserRole role,
      AccountType accountType,
      String orgLegalName) {

    UserAccount user = new UserAccount();
    user.setEmail(email);
    user.setPasswordHash(passwordHash);
    user.setDisplayName(displayName);
    user.setUsername(username);
    user.setRole(role);
    user.setAccountType(accountType);
    user.setOrgLegalName(orgLegalName);
    // Already confirmed, or every one of these would need a link followed
    // before it could be used for anything.
    user.setEmailVerifiedAt(now);
    return user;
  }
}
