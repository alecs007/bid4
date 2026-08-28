package ro.bid4.backend.identity;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import ro.bid4.backend.TestcontainersConfiguration;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.identity.api.dto.LoginRequest;
import ro.bid4.backend.identity.api.dto.RegisterRequest;
import ro.bid4.backend.identity.domain.AccountType;
import ro.bid4.backend.identity.service.AuthService;

/**
 * What happens when one refresh token is presented twice.
 *
 * <p>This goes through the service rather than MockMvc because the interesting case is two real
 * transactions overlapping, and MockMvc runs them on one thread.
 */
@SpringBootTest
@Import({TestcontainersConfiguration.class, MailCaptureConfiguration.class})
@TestPropertySource(
    properties = {"bid4.rate-limit.enabled=false", "bid4.verification.resend-cooldown=0s"})
class RefreshTokenExchangeTest {

  private static final String PASSWORD = "parola-buna-123";

  @Autowired private AuthService authService;
  @Autowired private JdbcTemplate jdbc;

  @Test
  @DisplayName("two callers presenting one token at once do not both get a session")
  void concurrentExchangeIsSerialised() throws Exception {
    AuthService.SessionResult login = signIn();
    UUID userId = login.session().user().id();

    // Both threads present the same token with no coordination. Before the row
    // lock, both read "not yet spent" and both succeeded, forking the session
    // into two live chains that reuse detection could not see.
    List<Future<Object>> results = raceOn(login.refreshToken());

    long succeeded = results.stream().filter(RefreshTokenExchangeTest::succeeded).count();
    assertThat(succeeded).as("one of the two exchanges must lose the race").isEqualTo(1);

    // The loser is judged on what the winner wrote, so it reads as a replay and
    // the family is cut. Harsh for a client that raced itself — which is why the
    // browser serialises its own tabs — but it is the whole point of rotation
    // that a token presented twice ends the session rather than forking it.
    assertThat(liveTokens(userId)).isZero();
    assertThat(reuseAuditRows(userId)).isEqualTo(1);
  }

  @Test
  @DisplayName("a replay after the exchange is theft, and cuts the whole family")
  void replayRevokesEverything() {
    AuthService.SessionResult login = signIn();
    UUID userId = login.session().user().id();

    authService.refresh(login.refreshToken(), "127.0.0.1", "test");

    // Deliberately unforgiving, and deliberately without a grace window: a
    // client that lost its response presents exactly this, and no rule can tell
    // the two apart. See AuthService.refresh.
    assertThat(catching(() -> authService.refresh(login.refreshToken(), "127.0.0.1", "test")))
        .isInstanceOf(ApiException.class);

    assertThat(liveTokens(userId)).isZero();
    assertThat(reuseAuditRows(userId)).isEqualTo(1);
  }

  private List<Future<Object>> raceOn(String token) throws Exception {
    try (ExecutorService pool = Executors.newFixedThreadPool(2)) {
      Callable<Object> exchange = () -> authService.refresh(token, "127.0.0.1", "test");
      return pool.invokeAll(List.of(exchange, exchange));
    }
  }

  private static boolean succeeded(Future<Object> result) {
    try {
      result.get();
      return true;
    } catch (Exception ex) {
      return false;
    }
  }

  private static Throwable catching(Runnable action) {
    try {
      action.run();
      return null;
    } catch (Throwable thrown) {
      return thrown;
    }
  }

  private AuthService.SessionResult signIn() {
    String email = "exchange-" + UUID.randomUUID() + "@bid4.ro";
    authService.register(
        new RegisterRequest(
            email, PASSWORD, "Schimb Test", AccountType.INDIVIDUAL, null, null, true),
        "127.0.0.1",
        "test");
    jdbc.update("update users set email_verified_at = now() where email = ?", email);
    return authService.login(new LoginRequest(email, PASSWORD), "127.0.0.1", "test");
  }

  private int liveTokens(UUID userId) {
    Integer count =
        jdbc.queryForObject(
            "select count(*) from refresh_tokens"
                + " where user_id = ? and revoked_at is null and rotated_to is null",
            Integer.class,
            userId);
    return count == null ? 0 : count;
  }

  private int reuseAuditRows(UUID userId) {
    Integer count =
        jdbc.queryForObject(
            "select count(*) from audit_log where actor_id = ? and action = 'REFRESH_TOKEN_REUSE'",
            Integer.class,
            userId);
    return count == null ? 0 : count;
  }
}
