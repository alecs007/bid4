package ro.bid4.backend.shipping.service;

import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "bid4.shipping.provider", havingValue = "stub", matchIfMissing = true)
public class StubCourierGateway implements CourierGateway {
  private static final String COURIER = "Sameday";

  private static final List<Locker> LOCKERS =
      List.of(
          new Locker(
              "BUC-142",
              "Easybox Auchan Titan",
              "Bd. 1 Decembrie 1918 nr. 33",
              "București",
              "Sector 3",
              14,
              "Non-stop"),
          new Locker(
              "BUC-207",
              "Easybox Kaufland Băneasa",
              "Șos. București-Ploiești 44",
              "București",
              "Sector 1",
              6,
              "07:00 – 23:00"),
          new Locker(
              "CLJ-058",
              "Easybox Kaufland Mărăști",
              "Str. Fabricii de Zahăr 5",
              "Cluj-Napoca",
              "Cluj",
              9,
              "Non-stop"),
          new Locker(
              "TIM-021",
              "Easybox Iulius Town",
              "Str. Aristide Demetriade 1",
              "Timișoara",
              "Timiș",
              3,
              "08:00 – 22:00"),
          new Locker(
              "IAS-034", "Easybox Palas Mall", "Str. Palas 7A", "Iași", "Iași", 11, "Non-stop"),
          new Locker(
              "BRA-017",
              "Easybox Coresi",
              "Str. Zaharia Stancu 1",
              "Brașov",
              "Brașov",
              8,
              "07:00 – 23:00"),
          new Locker(
              "SIB-009",
              "Easybox Promenada",
              "Str. Nicolae Teclu 50",
              "Sibiu",
              "Sibiu",
              5,
              "Non-stop"),
          new Locker(
              "CON-026",
              "Easybox City Park",
              "Bd. Alexandru Lăpușneanu 116C",
              "Constanța",
              "Constanța",
              12,
              "08:00 – 22:00"));

  @Override
  public List<Locker> lockers(String query) {
    String needle = fold(query == null ? "" : query);
    if (needle.isBlank()) {
      return LOCKERS;
    }
    return LOCKERS.stream()
        .filter(
            locker ->
                fold(String.join(
                        " ",
                        locker.name(),
                        locker.address(),
                        locker.city(),
                        locker.county(),
                        locker.id()))
                    .contains(needle))
        .toList();
  }

  private static String fold(String value) {
    return Normalizer.normalize(value.strip().toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
        .replaceAll("\\p{M}", "")
        .replace('ș', 's')
        .replace('ş', 's')
        .replace('ț', 't')
        .replace('ţ', 't');
  }

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
