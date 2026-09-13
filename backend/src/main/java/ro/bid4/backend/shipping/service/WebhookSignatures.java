package ro.bid4.backend.shipping.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Whether a callback really came from the provider.
 *
 * <p>A webhook route is open to the internet by necessity: the caller has no account and cannot
 * present a token. The signature is therefore the whole of its security, not a formality, and it is
 * checked before the body is parsed into anything that could move money or a parcel.
 *
 * <p>HMAC-SHA256 over the raw body, compared in constant time. Both providers bid4 will use work
 * this way; the header name differs and is passed in.
 *
 * <p>With no secret configured it refuses everything rather than accepting everything. A webhook
 * that silently trusts its caller because somebody forgot an environment variable is the failure
 * mode worth designing out, so the insecure state is the one that does not work. Dev drives these
 * transitions through the seeder instead.
 */
@Component
public class WebhookSignatures {

  private static final Logger log = LoggerFactory.getLogger(WebhookSignatures.class);

  private final String courierSecret;
  private final String paymentSecret;

  public WebhookSignatures(
      @Value("${bid4.shipping.webhook-secret:}") String courierSecret,
      @Value("${bid4.payments.webhook-secret:}") String paymentSecret) {
    this.courierSecret = courierSecret;
    this.paymentSecret = paymentSecret;
  }

  public boolean courierCallbackIsGenuine(String body, String signature) {
    return matches(courierSecret, body, signature, "courier");
  }

  public boolean paymentCallbackIsGenuine(String body, String signature) {
    return matches(paymentSecret, body, signature, "payments");
  }

  private boolean matches(String secret, String body, String signature, String which) {
    if (secret == null || secret.isBlank()) {
      log.warn("Refused a {} callback: bid4.{}.webhook-secret is not configured", which, which);
      return false;
    }
    if (signature == null || signature.isBlank()) {
      return false;
    }
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      byte[] expected = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
      return MessageDigest.isEqual(expected, decode(signature));
    } catch (Exception refused) {
      log.warn("Refused a {} callback: signature could not be verified", which);
      return false;
    }
  }

  /** Hex, which is what both providers send. */
  private static byte[] decode(String hex) {
    String clean = hex.startsWith("sha256=") ? hex.substring(7) : hex;
    if (clean.length() % 2 != 0) {
      return new byte[0];
    }
    byte[] out = new byte[clean.length() / 2];
    for (int index = 0; index < out.length; index++) {
      out[index] = (byte) Integer.parseInt(clean.substring(index * 2, index * 2 + 2), 16);
    }
    return out;
  }
}
