package ro.bid4.backend.billing.service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import org.springframework.stereotype.Component;
import ro.bid4.backend.billing.domain.DocumentKind;
import ro.bid4.backend.billing.repo.OrderDocumentRepository;

/**
 * The next number in a series.
 *
 * <p>Deliberately here and not at a provider: a fiscal series is a sequence with no gaps and no
 * repeats, and it has to be auditable from this application's own database. Asking an external
 * service for the next number means nobody here can prove the sequence.
 *
 * <p>Counted per series and per year, which is how Romanian series are read. Today it counts rows,
 * which is correct under a single writer and wrong under two: two documents issued in the same
 * instant would compute the same number, and the unique index on {@code number} would refuse the
 * second. That is the safe direction to be wrong in, and a Postgres sequence per series is the fix
 * when a second instance is real.
 */
@Component
public class DocumentNumbers {

  private final OrderDocumentRepository documents;

  public DocumentNumbers(OrderDocumentRepository documents) {
    this.documents = documents;
  }

  /** Null for kinds that carry no series: a courier's label is not a numbered document. */
  public String next(DocumentKind kind) {
    String series = seriesOf(kind);
    if (series == null) {
      return null;
    }
    int year = LocalDate.now(ZoneOffset.UTC).getYear();
    long issued = documents.count() + 1;
    return "%s-%d-%06d".formatted(series, year, issued);
  }

  private static String seriesOf(DocumentKind kind) {
    return switch (kind) {
      case PROFORMA -> "PRO";
      case INVOICE -> "BID4";
      case DONATION_RECEIPT -> "DON";
      case PAYOUT_STATEMENT -> "PAY";
      case SHIPPING_LABEL -> null;
    };
  }
}
