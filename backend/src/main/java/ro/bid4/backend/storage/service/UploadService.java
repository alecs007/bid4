package ro.bid4.backend.storage.service;

import java.io.IOException;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.storage.api.dto.StoredFileResponse;
import ro.bid4.backend.storage.domain.StoredFile;
import ro.bid4.backend.storage.domain.Visibility;
import ro.bid4.backend.storage.repo.StoredFileRepository;

@Service
public class UploadService {
  private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

  private static final long MAX_BYTES = 8L * 1024 * 1024;

  private static final int MAX_FILES = 8;

  private static final long MAX_PIXELS = 40_000_000L;

  private final ObjectStore store;
  private final StoredFileRepository files;

  public UploadService(ObjectStore store, StoredFileRepository files) {
    this.store = store;
    this.files = files;
  }

  @Transactional
  public List<StoredFileResponse> storeImages(List<MultipartFile> uploads, UUID ownerId) {
    if (uploads == null || uploads.isEmpty()) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Nu a fost trimisă nicio fotografie.");
    }
    if (uploads.size() > MAX_FILES) {
      throw new ApiException(
          ErrorCode.VALIDATION_FAILED, "Poți încărca cel mult " + MAX_FILES + " fotografii.");
    }

    List<Accepted> accepted = new ArrayList<>(uploads.size());
    for (MultipartFile upload : uploads) {
      accepted.add(inspect(upload));
    }

    List<String> written = new ArrayList<>(accepted.size());
    try {
      List<StoredFile> rows = new ArrayList<>(accepted.size());
      for (Accepted file : accepted) {
        String key = keyFor(ownerId, file.probed().contentType());
        store.put(store.publicBucket(), key, file.bytes(), file.probed().contentType());
        written.add(key);
        rows.add(row(file, key, ownerId));
      }
      return files.saveAll(rows).stream()
          .map(saved -> StoredFileResponse.of(saved, MediaUrls.forFile(saved.getId())))
          .toList();
    } catch (RuntimeException failure) {
      written.forEach(key -> store.discard(store.publicBucket(), key));
      throw failure;
    }
  }

  private record Accepted(byte[] bytes, ImageProbe.Probed probed, String originalName) {}

  private Accepted inspect(MultipartFile upload) {
    if (upload.isEmpty()) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Una dintre fotografii este goală.");
    }
    if (upload.getSize() > MAX_BYTES) {
      throw new ApiException(ErrorCode.PAYLOAD_TOO_LARGE);
    }

    byte[] bytes;
    try {
      bytes = upload.getBytes();
    } catch (IOException failure) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Fotografia nu a putut fi citită.");
    }
    if (bytes.length > MAX_BYTES) {
      throw new ApiException(ErrorCode.PAYLOAD_TOO_LARGE);
    }

    ImageProbe.Probed probed =
        ImageProbe.probe(bytes)
            .filter(found -> IMAGE_TYPES.contains(found.contentType()))
            .orElseThrow(() -> new ApiException(ErrorCode.UNSUPPORTED_MEDIA_TYPE));

    if (probed.pixels() > MAX_PIXELS) {
      throw new ApiException(ErrorCode.VALIDATION_FAILED, "Fotografia are o rezoluție prea mare.");
    }

    return new Accepted(bytes, probed, safeName(upload.getOriginalFilename()));
  }

  private StoredFile row(Accepted file, String key, UUID ownerId) {
    StoredFile row = new StoredFile();
    row.setBucket(store.publicBucket());
    row.setObjectKey(key);
    row.setVisibility(Visibility.PUBLIC);
    row.setOriginalName(file.originalName());
    row.setContentType(file.probed().contentType());
    row.setSizeBytes(file.bytes().length);
    row.setChecksumSha256(sha256(file.bytes()));
    row.setOwnerId(ownerId);
    return row;
  }

  private String keyFor(UUID ownerId, String contentType) {
    String extension =
        switch (contentType) {
          case "image/png" -> "png";
          case "image/webp" -> "webp";
          default -> "jpg";
        };
    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    return "listings/%d/%02d/%s/%s.%s"
        .formatted(today.getYear(), today.getMonthValue(), ownerId, UUID.randomUUID(), extension);
  }

  private String safeName(String original) {
    String name = Optional.ofNullable(original).orElse("photo");
    String cleaned = name.replaceAll("[\\p{Cntrl}\\\\/\"\r\n]", "").trim();
    if (cleaned.isEmpty()) {
      cleaned = "photo";
    }
    return cleaned.length() > 255
        ? cleaned.substring(0, 255).toLowerCase(Locale.ROOT)
        : cleaned.toLowerCase(Locale.ROOT);
  }

  private String sha256(byte[] bytes) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
    } catch (NoSuchAlgorithmException impossible) {
      throw new IllegalStateException("SHA-256 is required of every JVM", impossible);
    }
  }
}
