package ro.bid4.backend.storage.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;

/**
 * The index over MinIO: one row per object, and the only place an object key exists.
 *
 * <p>Nothing in the application builds a key by hand — it reads the one on this row. A caller
 * therefore cannot reach an object by guessing a key, cannot enumerate the bucket by counting, and
 * cannot reach one it does not own without failing the check on {@link #ownerId}.
 *
 * <p>The row is written after the object lands, so a row always describes something that exists.
 * The reverse can happen — an object with no row, if the insert fails — and that is deliberate: an
 * orphan in a bucket is unreachable, because reaching anything starts here.
 */
@Getter
@Setter
@Entity
@Table(name = "stored_files")
public class StoredFile {

  @Id
  @GeneratedValue
  @Column(updatable = false, nullable = false)
  private UUID id;

  @Column(nullable = false, length = 63)
  private String bucket;

  @Column(name = "object_key", nullable = false, length = 512)
  private String objectKey;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private Visibility visibility = Visibility.PRIVATE;

  /**
   * What the file was called when it was chosen, kept for the download name and nothing else.
   *
   * <p>Never part of a key or a path. It is text somebody else wrote, and the moment it decides
   * where bytes are written it decides where bytes can be written.
   */
  @Column(name = "original_name", nullable = false, length = 255)
  private String originalName;

  @Column(name = "content_type", nullable = false, length = 120)
  private String contentType;

  @Column(name = "size_bytes", nullable = false)
  private long sizeBytes;

  /** Of the bytes as stored, so a later read can be checked against what was written. */
  @Column(name = "checksum_sha256", nullable = false, length = 64)
  private String checksumSha256;

  /** Who uploaded it. Null once that account is deleted; the object outlives them. */
  @Column(name = "owner_id")
  private UUID ownerId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private Instant createdAt = Instant.now();

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    return other instanceof StoredFile that && id != null && id.equals(that.id);
  }

  @Override
  public int hashCode() {
    return Objects.hashCode(id);
  }
}
