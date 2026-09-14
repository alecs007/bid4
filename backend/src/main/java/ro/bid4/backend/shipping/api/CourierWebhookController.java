package ro.bid4.backend.shipping.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.shipping.service.CourierScans;
import ro.bid4.backend.shipping.service.WebhookSignatures;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/webhooks/courier")
public class CourierWebhookController {
  private static final Logger log = LoggerFactory.getLogger(CourierWebhookController.class);

  private final CourierScans scans;
  private final WebhookSignatures signatures;
  private final ObjectMapper json;

  public CourierWebhookController(
      CourierScans scans, WebhookSignatures signatures, ObjectMapper json) {
    this.scans = scans;
    this.signatures = signatures;
    this.json = json;
  }

  @PostMapping
  ResponseEntity<Void> scan(
      @RequestBody String body,
      @RequestHeader(name = "X-Bid4-Signature", required = false) String signature) {
    if (!signatures.courierCallbackIsGenuine(body, signature)) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    Callback callback;
    try {
      callback = json.readValue(body, Callback.class);
    } catch (RuntimeException malformed) {
      log.warn("Courier callback signed but unreadable");
      return ResponseEntity.badRequest().build();
    }

    if (callback.awb() == null || callback.eventId() == null) {
      return ResponseEntity.badRequest().build();
    }

    scans.record(
        callback.eventId(),
        callback.awb(),
        callback.status(),
        callback.location(),
        callback.description());

    return ResponseEntity.ok().build();
  }

  record Callback(String eventId, String awb, String status, String location, String description) {}
}
