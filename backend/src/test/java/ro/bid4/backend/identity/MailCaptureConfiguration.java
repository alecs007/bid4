package ro.bid4.backend.identity;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.mail.javamail.JavaMailSender;
import ro.bid4.backend.common.config.Bid4Properties;
import ro.bid4.backend.identity.service.VerificationMailer;

/**
 * Reads the confirmation link out of the message instead of out of a mailbox.
 *
 * <p>The token is only ever stored as a hash, so a test cannot recover it from the database — which
 * is exactly the property being relied on. Standing in for the mailer is the only honest way to get
 * it, and it keeps the tests from needing an SMTP server.
 *
 * <p>One queue per address, awaited rather than read. Sending is {@code @Async}, so a single shared
 * reference is a race the caller usually wins and occasionally does not: on a loaded machine the
 * request returned before the mail thread had written, and the test read the token left by the
 * previous test — a link that was still valid, so redeeming it succeeded where the test demanded a
 * refusal. Queueing per recipient also keeps two links to the same address in the order they were
 * sent, which is what a reissue test is about.
 */
@TestConfiguration(proxyBeanMethods = false)
public class MailCaptureConfiguration {

  private static final long WAIT_SECONDS = 10;

  private static final ConcurrentMap<String, BlockingQueue<String>> SENT =
      new ConcurrentHashMap<>();

  /** The next link sent to this address, waiting for it if the mail thread is still behind. */
  public static String awaitTokenFor(String address) {
    String token;
    try {
      token = mailbox(address).poll(WAIT_SECONDS, TimeUnit.SECONDS);
    } catch (InterruptedException interrupted) {
      Thread.currentThread().interrupt();
      throw new AssertionError("Interrupted waiting for a verification mail to " + address);
    }
    if (token == null) {
      throw new AssertionError(
          "No verification mail reached " + address + " within " + WAIT_SECONDS + "s");
    }
    return token;
  }

  private static BlockingQueue<String> mailbox(String address) {
    return SENT.computeIfAbsent(address, ignored -> new LinkedBlockingQueue<>());
  }

  @Bean
  @Primary
  VerificationMailer capturingMailer(JavaMailSender sender, Bid4Properties properties) {
    return new VerificationMailer(sender, properties) {
      @Override
      public void sendVerification(String toAddress, String displayName, String rawToken) {
        mailbox(toAddress).add(rawToken);
      }
    };
  }
}
