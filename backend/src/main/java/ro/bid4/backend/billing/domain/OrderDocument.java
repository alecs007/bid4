package ro.bid4.backend.billing.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * One issued document.
 *
 * <p>Immutable once written — a database trigger refuses UPDATE outright, the same way acceptances
 * and ledger entries are protected. A document that can be edited after it has been sent is not
 * evidence of anything, and correcting one is done by issuing another.
 */
@Getter
@Setter
@Entity
@Table(name = "order_documents")
public class OrderDocument {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "order_id", nullable = false, updatable = false)
  private UUID orderId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, updatable = false)
  private DocumentKind kind;

  /** Null for documents that carry no series, such as a courier's label. */
  @Column(updatable = false)
  private String number;

  @Column(name = "issued_to", nullable = false, updatable = false)
  private UUID issuedTo;

  @Column(nullable = false, updatable = false)
  private long amount;

  /** Null while the document is promised and not yet rendered. */
  @Column(name = "storage_key", updatable = false)
  private String storageKey;

  @Column(name = "content_type", updatable = false)
  private String contentType;

  @Column(name = "issued_at", nullable = false, updatable = false)
  private Instant issuedAt = Instant.now();

  public static OrderDocument of(
      UUID orderId, DocumentKind kind, UUID issuedTo, long amount, String number) {
    OrderDocument document = new OrderDocument();
    document.orderId = orderId;
    document.kind = kind;
    document.issuedTo = issuedTo;
    document.amount = amount;
    document.number = number;
    return document;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof OrderDocument that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
