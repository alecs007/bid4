package ro.bid4.backend.storage.api.dto;

import java.util.UUID;
import ro.bid4.backend.storage.domain.StoredFile;

public record StoredFileResponse(
    UUID fileRef, String url, String fileName, String contentType, long sizeBytes) {
  public static StoredFileResponse of(StoredFile file, String url) {
    return new StoredFileResponse(
        file.getId(), url, file.getOriginalName(), file.getContentType(), file.getSizeBytes());
  }
}
