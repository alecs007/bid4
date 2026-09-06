package ro.bid4.backend.storage.api;

import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import ro.bid4.backend.common.error.ApiException;
import ro.bid4.backend.common.error.ErrorCode;
import ro.bid4.backend.common.web.Viewer;
import ro.bid4.backend.security.web.Viewers;
import ro.bid4.backend.storage.api.dto.StoredFileResponse;
import ro.bid4.backend.storage.service.UploadService;

/**
 * POST /uploads/images — the frontend's uploadImages in lib/api/uploads.ts.
 *
 * <p>Its own endpoint rather than part of creating a listing, because the two fail differently. A
 * listing that cannot be created leaves the seller's form exactly as it was and they try again;
 * bytes that were sent with it and lost leave them re-choosing eight photographs. Uploading first
 * means the listing is only ever created from objects that already exist.
 *
 * <p>Authenticated, by the chain's deny-by-default rule and not by anything written here. The owner
 * is the token's subject, so nothing an uploader sends decides whose the file is.
 */
@RestController
@RequestMapping("/uploads")
public class UploadController {

  private final UploadService uploads;

  public UploadController(UploadService uploads) {
    this.uploads = uploads;
  }

  @PostMapping("/images")
  ResponseEntity<List<StoredFileResponse>> images(
      @RequestParam("files") List<MultipartFile> files, @AuthenticationPrincipal Jwt jwt) {
    Viewer uploader = Viewers.from(jwt);
    if (uploader.isAnonymous()) {
      throw new ApiException(ErrorCode.UNAUTHENTICATED);
    }
    UUID owner = uploader.id();

    return ResponseEntity.status(HttpStatus.CREATED).body(uploads.storeImages(files, owner));
  }
}
