package ro.bid4.backend.storage.api.dto;

import java.util.UUID;
import ro.bid4.backend.storage.domain.StoredFile;

/**
 * One stored object, as the uploader is told about it.
 *
 * <p>{@code fileRef} is what a listing is created with, and {@code url} is where the picture can be
 * seen. The frontend's UploadedFileRef in lib/api/uploads.ts is this shape.
 *
 * <p>The object key is not here and is never sent anywhere: it is the one thing that would let a
 * caller address the bucket instead of the application.
 */
public record StoredFileResponse(
    UUID fileRef, String url, String fileName, String contentType, long sizeBytes) {

  public static StoredFileResponse of(StoredFile file, String url) {
    return new StoredFileResponse(
        file.getId(), url, file.getOriginalName(), file.getContentType(), file.getSizeBytes());
  }
}
