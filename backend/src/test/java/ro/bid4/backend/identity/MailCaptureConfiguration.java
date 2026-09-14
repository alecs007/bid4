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

@TestConfiguration(proxyBeanMethods = false)
public class MailCaptureConfiguration {
  private static final long WAIT_SECONDS = 10;

  private static final ConcurrentMap<String, BlockingQueue<String>> SENT =
      new ConcurrentHashMap<>();

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
