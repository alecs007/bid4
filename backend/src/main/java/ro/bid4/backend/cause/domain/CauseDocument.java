package ro.bid4.backend.cause.domain;

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

/** One piece of paperwork behind a cause's claim to be what it says it is. */
@Getter
@Setter
@Entity
@Table(name = "cause_documents")
public class CauseDocument {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "cause_id", nullable = false)
  private UUID causeId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CauseDocumentKind kind = CauseDocumentKind.OTHER;

  @Column(name = "file_name", nullable = false)
  private String fileName;

  @Column(name = "file_url", nullable = false, length = 8192)
  private String fileUrl;

  @Column(name = "size_bytes", nullable = false)
  private long sizeBytes;

  @Column(name = "uploaded_at", nullable = false, updatable = false)
  private Instant uploadedAt = Instant.now();

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof CauseDocument that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
