package ro.bid4.backend.storage.service;

import java.io.InputStream;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.storage.domain.StoredFile;
import ro.bid4.backend.storage.domain.Visibility;
import ro.bid4.backend.storage.repo.StoredFileRepository;

/**
 * Finds a stored object and opens it, for the one route that serves bytes.
 *
 * <p>The row is what decides whether there is anything to serve. An id that names a private object
 * answers exactly as an id that names nothing does, so this route cannot be used to find out
 * whether an identity document exists.
 */
@Service
public class MediaService {

  private final StoredFileRepository files;
  private final ObjectStore store;

  public MediaService(StoredFileRepository files, ObjectStore store) {
    this.files = files;
    this.store = store;
  }

  /**
   * What the response is built from: the headers, and the bytes behind them.
   *
   * <p>The stream is the caller's to close, which the framework does once it has written the body.
   */
  public record Media(String contentType, long sizeBytes, String checksum, InputStream body) {}

  @Transactional(readOnly = true)
  public Media open(UUID id) {
    StoredFile file =
        files
            .findById(id)
            .filter(found -> found.getVisibility() == Visibility.PUBLIC)
            .orElseThrow(() -> ApiException.notFound("Fișierul"));

    return new Media(
        file.getContentType(),
        file.getSizeBytes(),
        file.getChecksumSha256(),
        store.open(file.getBucket(), file.getObjectKey()));
  }
}
