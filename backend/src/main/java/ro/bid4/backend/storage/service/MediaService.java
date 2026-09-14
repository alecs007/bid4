package ro.bid4.backend.storage.service;

import java.io.InputStream;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.storage.domain.StoredFile;
import ro.bid4.backend.storage.domain.Visibility;
import ro.bid4.backend.storage.repo.StoredFileRepository;

@Service
public class MediaService {
  private final StoredFileRepository files;
  private final ObjectStore store;

  public MediaService(StoredFileRepository files, ObjectStore store) {
    this.files = files;
    this.store = store;
  }

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
