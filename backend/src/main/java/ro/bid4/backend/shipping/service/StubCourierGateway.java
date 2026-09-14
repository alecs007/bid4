package ro.bid4.backend.shipping.service;

import java.nio.charset.StandardCharsets;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "bid4.shipping.provider", havingValue = "stub", matchIfMissing = true)
public class StubCourierGateway implements CourierGateway {
  private static final String COURIER = "Sameday";

  @Override
  public AwbIssued issue(Shipment shipment) {
    String awb = "SMD%011d".formatted(ThreadLocalRandom.current().nextLong(100_000_000_000L));
    return new AwbIssued(awb, COURIER, "https://sameday.ro/track/" + awb);
  }

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
