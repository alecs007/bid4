package ro.bid4.backend.identity.service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import ro.bid4.backend.common.config.Bid4Properties;

/**
 * Sends the one message this application currently writes.
 *
 * <p>Plain text, not HTML: a confirmation link needs no markup, and a plain message cannot carry a
 * tracking pixel or a remote image. It also survives every client unchanged.
 *
 * <p>Sent asynchronously. A slow or unreachable mail server must not hold a registration request
 * open — the account already exists by then, and a failure here is recoverable by asking for
 * another link.
 */
@Component
public class VerificationMailer {

  private static final Logger log = LoggerFactory.getLogger(VerificationMailer.class);

  private final JavaMailSender sender;
  private final Bid4Properties properties;

  public VerificationMailer(JavaMailSender sender, Bid4Properties properties) {
    this.sender = sender;
    this.properties = properties;
  }

  @Async
  public void sendVerification(String toAddress, String displayName, String rawToken) {
    String link =
        properties.mail().webBaseUrl()
            + "/confirmare-email?token="
            + URLEncoder.encode(rawToken, StandardCharsets.UTF_8);

    SimpleMailMessage message = new SimpleMailMessage();
    message.setFrom(properties.mail().from());
    message.setTo(toAddress);
    message.setSubject("Confirmă adresa de email — bid4");
    message.setText(
        """
        Salut, %s!

        Confirmă adresa de email ca să îți poți folosi contul bid4:

        %s

        Linkul este valabil %d de ore. Dacă nu tu ai creat contul, ignoră acest
        mesaj — fără confirmare, contul nu poate fi folosit.

        Echipa bid4
        """
            .formatted(displayName, link, properties.verification().tokenTtl().toHours()));

    try {
      sender.send(message);
    } catch (MailException ex) {
      // The token is already stored, so the address can ask for another link.
      // Logged without the token: an address is not a secret, a token is.
      log.error("Could not send the verification message to {}", toAddress, ex);
    }
  }
}
