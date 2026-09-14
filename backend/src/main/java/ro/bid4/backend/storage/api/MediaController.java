package ro.bid4.backend.storage.api;

import java.time.Duration;
import java.util.UUID;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.storage.service.MediaService;

@RestController
@RequestMapping("/media")
public class MediaController {
  private static final Duration FOREVER = Duration.ofDays(365);

  private final MediaService media;

  public MediaController(MediaService media) {
    this.media = media;
  }

  @GetMapping("/{id}")
  ResponseEntity<InputStreamResource> serve(@PathVariable UUID id) {
    MediaService.Media file = media.open(id);

    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(file.contentType()))
        .contentLength(file.sizeBytes())
        .cacheControl(CacheControl.maxAge(FOREVER).cachePublic().immutable())
        .eTag('"' + file.checksum() + '"')
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().build().toString())
        .body(new InputStreamResource(file.body()));
  }
}
