package ro.bid4.backend.cause.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * Support for the story a cause tells.
 *
 * <p>Separate from {@link CauseDocument}, which proves who someone is. A medical letter and an ID
 * card answer different questions and are shown to different people.
 */
@Getter
@Setter
@Entity
@Table(name = "cause_evidence")
public class CauseEvidence {

  @Id
  @GeneratedValue(strategy = GenerationType.UUID)
  @Column(nullable = false, updatable = false)
  private UUID id;

  @Column(name = "cause_id", nullable = false)
  private UUID causeId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false)
  private CauseEvidenceType type = CauseEvidenceType.OTHER;

  @Column(name = "file_name", nullable = false)
  private String fileName;

  @Column(name = "file_ref", nullable = false, length = 8192)
  private String fileRef;

  private String note;

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof CauseEvidence that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
