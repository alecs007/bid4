package ro.bid4.backend.identity;

import java.util.concurrent.atomic.AtomicReference;
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
 */
@TestConfiguration(proxyBeanMethods = false)
public class MailCaptureConfiguration {

  public static final AtomicReference<String> LAST_TOKEN = new AtomicReference<>();
  public static final AtomicReference<String> LAST_RECIPIENT = new AtomicReference<>();

  @Bean
  @Primary
  VerificationMailer capturingMailer(JavaMailSender sender, Bid4Properties properties) {
    return new VerificationMailer(sender, properties) {
      @Override
      public void sendVerification(String toAddress, String displayName, String rawToken) {
        LAST_RECIPIENT.set(toAddress);
        LAST_TOKEN.set(rawToken);
      }
    };
  }
}
