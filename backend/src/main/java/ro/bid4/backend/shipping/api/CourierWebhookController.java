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

/**
 * Where a parcel's movements come from.
 *
 * <p>The three statuses in the middle of a sale are reachable only from here. Neither party may
 * claim a parcel moved, so there is no endpoint either of them can call to say it did — this route
 * and the courier's own scans are the whole of it.
 *
 * <p>Three things make it safe to leave open, which it must be, because a courier has no account
 * and cannot present a token:
 *
 * <ul>
 *   <li>the body is authenticated by HMAC over the raw bytes, checked before it is parsed;
 *   <li>the callback names a consignment, and an AWB nobody has heard of is ignored;
 *   <li>every scan carries the courier's own event id, and recording one is idempotent on it.
 * </ul>
 *
 * <p>It answers 200 to almost everything on purpose. A courier retries any other status, forever,
 * and a parcel we cannot place is not a failure on this side — so unknown consignments, codes that
 * mean nothing to a sale, and repeats of a scan already recorded are all accepted and dropped. The
 * one refusal is a body that is not signed, because that is not the courier calling.
 */
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

  /**
   * Takes the raw body rather than a bound DTO.
   *
   * <p>The signature is over the exact bytes the courier sent. Letting Spring parse the body first
   * and re-serialising it to verify would compare a signature against something else — key order,
   * whitespace and number formatting all change — and the check would fail for honest callers or,
   * worse, be quietly relaxed until it passed.
   */
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
      // Signed by the courier and still unreadable: their problem to fix, and
      // repeating it at us will not help.
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

  /**
   * Parsed by hand from the verified body.
   *
   * <p>Not a validated {@code @RequestBody} record, because binding happens before the signature is
   * checked and nothing unverified should reach a validator.
   */
  record Callback(String eventId, String awb, String status, String location, String description) {}
}
