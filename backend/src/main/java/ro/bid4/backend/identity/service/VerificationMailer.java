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
      log.error("Could not send the verification message to {}", toAddress, ex);
    }
  }
}
