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
