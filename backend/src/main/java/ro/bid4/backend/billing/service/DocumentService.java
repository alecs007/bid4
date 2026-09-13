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

/**
 * What a sale has on paper.
 *
 * <p>Issuing records the fact and the number; rendering the bytes is a separate concern and may not
 * be possible yet. That split is what lets an invoice exist as a promise with a number reserved,
 * which is how the UI can list it honestly before a provider is wired up.
 *
 * <p>Issuing is idempotent on (order, kind), enforced both here and by a unique index. A step that
 * is retried must not issue a second invoice, because the first one may already have been sent.
 */
@Service
public class DocumentService {

  private final OrderDocumentRepository documents;
  private final DocumentNumbers numbers;

  public DocumentService(OrderDocumentRepository documents, DocumentNumbers numbers) {
    this.documents = documents;
    this.numbers = numbers;
  }

  /**
   * Records that a document is due, reserving its number.
   *
   * <p>Asked before inserting rather than catching the constraint violation: catching a {@code
   * DataIntegrityViolationException} inside the caller's transaction marks it rollback-only and the
   * step that was being recorded fails at commit. The unique index stays as the backstop.
   */
  @Transactional
  public OrderDocument issue(UUID orderId, DocumentKind kind, UUID issuedTo, long amount) {
    Optional<OrderDocument> existing = documents.findByOrderIdAndKind(orderId, kind);
    if (existing.isPresent()) {
      return existing.get();
    }
    return documents.save(OrderDocument.of(orderId, kind, issuedTo, amount, numbers.next(kind)));
  }

  /** Everything on this sale's file, oldest first. Names come from the caller. */
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

  /** The number a document was issued under, for reprinting it exactly as it was. */
  @Transactional(readOnly = true)
  public Optional<String> numberOf(UUID orderId, DocumentKind kind) {
    return documents.findByOrderIdAndKind(orderId, kind).map(OrderDocument::getNumber);
  }

  /** The kind named in a path, or a 400 rather than a 500. */
  public static DocumentKind kindOf(String name) {
    try {
      return DocumentKind.valueOf(name.toUpperCase());
    } catch (IllegalArgumentException unknown) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Tip de document necunoscut.");
    }
  }

  /** How a user id becomes a name, without this service knowing what a user is. */
  public interface NameLookup {
    String nameOf(UUID userId);
  }
}
