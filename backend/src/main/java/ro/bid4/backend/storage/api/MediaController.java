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

/**
 * GET /media/{id} — a listing's photographs, by the id the listing carries.
 *
 * <p>Open to anyone, because browsing is: a photograph of something for sale is shown to whoever
 * opens the page, and asking them to sign in to see it would defeat the site. Only objects marked
 * PUBLIC are served here, so nothing that identifies a person can be reached through this route
 * however its id is come by.
 *
 * <p>The bytes travel through this application rather than from the bucket directly. The bucket has
 * no anonymous policy, and giving it one would turn every id into a permanent public link outside
 * anything this service could later refuse.
 *
 * <p>Cached hard and for a year. An id names one set of bytes for ever — nothing is ever written
 * over an id — so the answer cannot go stale, and marking it {@code immutable} is what keeps a
 * browser from revalidating a picture it already has.
 */
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
        // The type agreed on when the bytes were sniffed, never one the
        // uploader declared. With nosniff already on every response, this is
        // what decides how the browser treats them.
        .contentType(MediaType.parseMediaType(file.contentType()))
        .contentLength(file.sizeBytes())
        .cacheControl(CacheControl.maxAge(FOREVER).cachePublic().immutable())
        .eTag('"' + file.checksum() + '"')
        // Inline, and with no filename: the name came from whoever uploaded it,
        // and a download name is not worth handing their text to a browser.
        .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline().build().toString())
        .body(new InputStreamResource(file.body()));
  }
}
