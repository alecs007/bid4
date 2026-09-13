package ro.bid4.backend.billing.api;

import java.util.List;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.billing.api.dto.DocumentResponse;
import ro.bid4.backend.billing.service.SaleDocuments;
import ro.bid4.backend.security.web.Viewers;

/**
 * A sale's paperwork.
 *
 * <p>Two routes, and the split matters: one lists what exists so a page can show it, the other
 * streams one document so nothing about a file's contents passes through a JSON response.
 *
 * <p>The kind is taken as a string rather than the enum, so an unrecognised one answers 400 with a
 * readable message instead of Spring's own conversion failure — and so this package's api layer
 * stays free of its domain, which ArchUnit enforces.
 */
@RestController
@RequestMapping("/orders/{id}/documents")
public class DocumentController {

  private final SaleDocuments documents;

  public DocumentController(SaleDocuments documents) {
    this.documents = documents;
  }

  @GetMapping
  List<DocumentResponse> list(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return documents.listFor(id, Viewers.from(jwt));
  }

  /** Attachment, always: these are documents to keep, not pages to read in a tab. */
  @GetMapping("/{kind}")
  ResponseEntity<byte[]> download(
      @PathVariable UUID id, @PathVariable String kind, @AuthenticationPrincipal Jwt jwt) {
    SaleDocuments.Download file = documents.download(id, kind, Viewers.from(jwt));
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(file.contentType()))
        .header(
            HttpHeaders.CONTENT_DISPOSITION,
            ContentDisposition.attachment().filename(file.filename()).build().toString())
        .body(file.bytes());
  }
}
