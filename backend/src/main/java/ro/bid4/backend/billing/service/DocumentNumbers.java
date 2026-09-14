package ro.bid4.backend.billing.service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import org.springframework.stereotype.Component;
import ro.bid4.backend.billing.domain.DocumentKind;
import ro.bid4.backend.billing.repo.OrderDocumentRepository;

@Component
public class DocumentNumbers {
  private final OrderDocumentRepository documents;

  public DocumentNumbers(OrderDocumentRepository documents) {
    this.documents = documents;
  }

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
