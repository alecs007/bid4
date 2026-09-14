package ro.bid4.backend.billing.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.billing.api.dto.DocumentResponse;
import ro.bid4.backend.billing.domain.DocumentKind;
import ro.bid4.backend.billing.domain.OrderDocument;
import ro.bid4.backend.billing.repo.OrderDocumentRepository;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;

@Service
public class DocumentService {
  private final OrderDocumentRepository documents;
  private final DocumentNumbers numbers;

  public DocumentService(OrderDocumentRepository documents, DocumentNumbers numbers) {
    this.documents = documents;
    this.numbers = numbers;
  }

  @Transactional
  public OrderDocument issue(UUID orderId, DocumentKind kind, UUID issuedTo, long amount) {
    Optional<OrderDocument> existing = documents.findByOrderIdAndKind(orderId, kind);
    if (existing.isPresent()) {
      return existing.get();
    }
    return documents.save(OrderDocument.of(orderId, kind, issuedTo, amount, numbers.next(kind)));
  }

  @Transactional(readOnly = true)
  public List<DocumentResponse> forOrder(UUID orderId, NameLookup names) {
    return documents.findByOrderIdOrderByIssuedAtAsc(orderId).stream()
        .map(
            row ->
                new DocumentResponse(
                    row.getKind().name(),
                    row.getNumber(),
                    names.nameOf(row.getIssuedTo()),
                    row.getAmount(),
                    row.getStorageKey() != null,
                    row.getIssuedAt()))
        .toList();
  }

  @Transactional(readOnly = true)
  public Optional<String> numberOf(UUID orderId, DocumentKind kind) {
    return documents.findByOrderIdAndKind(orderId, kind).map(OrderDocument::getNumber);
  }

  public static DocumentKind kindOf(String name) {
    try {
      return DocumentKind.valueOf(name.toUpperCase());
    } catch (IllegalArgumentException unknown) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Tip de document necunoscut.");
    }
  }

  public interface NameLookup {
    String nameOf(UUID userId);
  }
}
