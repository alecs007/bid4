package ro.bid4.backend.shipping.service;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * A courier that books nothing.
 *
 * <p>Stands in until Sameday is wired up, and deliberately shaped exactly like the thing that will
 * replace it: a number that looks like theirs, a label with the right content type, a tracking URL
 * that resolves. So the whole sale can be walked end to end without an account at a courier, and
 * swapping in the real one changes no caller.
 *
 * <p>What it cannot do is move a parcel. The three statuses in the middle of the journey arrive
 * only through the webhook, from the courier's own scans — see {@code CourierWebhookController} —
 * so against this gateway they are driven by the seeder or by a hand-made callback.
 */
@Component
@ConditionalOnProperty(name = "bid4.shipping.provider", havingValue = "stub", matchIfMissing = true)
public class StubCourierGateway implements CourierGateway {

  private static final String COURIER = "Sameday";

  @Override
  public AwbIssued issue(Shipment shipment) {
    // Not idempotent on the reference, unlike the contract the interface asks
    // for: there is nothing to be idempotent against without a provider to ask.
    // The caller is inside one transaction and the order carries at most one
    // AWB, so a retry overwrites rather than books twice.
    String awb = "SMD%011d".formatted(ThreadLocalRandom.current().nextLong(100_000_000_000L));
    return new AwbIssued(awb, COURIER, "https://sameday.ro/track/" + awb);
  }

  /**
   * A placeholder, not a label.
   *
   * <p>It answers with the AWB as plain text rather than a PDF that looks real, because a document
   * that looks like a label and cannot be scanned is worse than one that plainly says what it is.
   */
  @Override
  public LabelDocument label(String awb) {
    String body =
        """
        bid4 — etichetă de expediere

        AWB: %s
        Curier: %s

        Acesta este un document generat local, pentru dezvoltare.
        Eticheta reală este emisă de curier.
        """
            .formatted(awb, COURIER);
    return new LabelDocument(
        "text/plain; charset=utf-8",
        "awb-%s.txt".formatted(awb),
        body.getBytes(StandardCharsets.UTF_8));
  }

  @Override
  public String name() {
    return COURIER;
  }
}
