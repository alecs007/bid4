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

/**
 * Takes photographs in, and answers with something a listing can be built from.
 *
 * <p>The browser has already decoded, turned, scaled and re-encoded every one of these, which is
 * what makes them small. None of that counts here. What arrives is bytes from the network, and the
 * checks below are written as though the browser half does not exist — because for anyone posting
 * to this endpoint directly, it does not.
 *
 * <p>What is checked, in order, and why each one is not enough on its own:
 *
 * <ul>
 *   <li><b>Count and size.</b> Refused before anything is read, so the cost of a bad request is
 *       bounded by the container's own multipart cap rather than by this code.
 *   <li><b>What the bytes are.</b> Read from the file's own header. The declared type and the
 *       filename are the caller's claims and neither is used for anything; the sniffed type is what
 *       decides whether the file is allowed, and it is what the object is stored and later served
 *       as. This is what keeps {@code text/html} from being stored and handed back as a document.
 *   <li><b>How large the picture is.</b> Also from the header, without decoding. A few kilobytes
 *       can unpack into hundreds of megabytes, so the ceiling has to be checked before anything
 *       would decode it — here, and again by whatever renders it later.
 *   <li><b>Where it goes.</b> The key is generated, never built from the name that came with the
 *       file. A name that decides where bytes are written decides what can be overwritten.
 * </ul>
 */
@Service
public class UploadService {

  /** Mirrors the frontend's IMAGE.ACCEPTED_TYPES and the stored_files CHECK, minus the PDF. */
  private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

  /** The column's CHECK refuses anything larger, so this is the readable half of that rule. */
  private static final long MAX_BYTES = 8L * 1024 * 1024;

  /** As many as a listing may carry, so one request cannot be used to fill the bucket. */
  private static final int MAX_FILES = 8;

  /** The same ceiling the browser holds a decode to. */
  private static final long MAX_PIXELS = 40_000_000L;

  private final ObjectStore store;
  private final StoredFileRepository files;

  public UploadService(ObjectStore store, StoredFileRepository files) {
    this.store = store;
    this.files = files;
  }

  /**
   * Stores every photograph or none of them.
   *
   * <p>Every file is validated before any object is written, so a set with one bad file in it does
   * not leave the good ones behind in the bucket for a request that failed.
   */
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
      // Whatever landed before the failure can no longer be reached, because
      // reaching an object starts at its row and the rows are rolled back.
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
    // Again on the bytes themselves: getSize() is the declared length of the
    // part, and the two are only the same when the caller is honest.
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

  /**
   * Where the object goes: whose it is, when it arrived, and a fresh name.
   *
   * <p>Generated rather than derived from anything the caller sent. A key built from a filename is
   * a path built from user input, and the two things that follow are traversal and overwriting
   * somebody else's object by guessing its name. The date is only there to keep a bucket listing
   * navigable by a human.
   */
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

  /**
   * The name, reduced to something safe to store and to hand back as a download name.
   *
   * <p>It never decides where anything is written — see above — so this is about what a browser
   * does with it later, and about the column being 255 characters wide.
   */
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
