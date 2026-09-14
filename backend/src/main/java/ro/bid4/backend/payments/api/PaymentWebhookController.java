package ro.bid4.backend.payments.api;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.orders.service.OrderService;
import ro.bid4.backend.shipping.service.WebhookSignatures;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/webhooks/payments")
public class PaymentWebhookController {
  private static final Logger log = LoggerFactory.getLogger(PaymentWebhookController.class);

  private final OrderService orders;
  private final WebhookSignatures signatures;
  private final ObjectMapper json;

  public PaymentWebhookController(
      OrderService orders, WebhookSignatures signatures, ObjectMapper json) {
    this.orders = orders;
    this.signatures = signatures;
    this.json = json;
  }

  @PostMapping
  ResponseEntity<Void> outcome(
      @RequestBody String body,
      @RequestHeader(name = "X-Bid4-Signature", required = false) String signature) {
    if (!signatures.paymentCallbackIsGenuine(body, signature)) {
      return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    Callback callback;
    try {
      callback = json.readValue(body, Callback.class);
    } catch (RuntimeException malformed) {
      log.warn("Payment callback signed but unreadable");
      return ResponseEntity.badRequest().build();
    }

    if (callback.paymentReference() == null || callback.outcome() == null) {
      return ResponseEntity.badRequest().build();
    }

    switch (callback.outcome().toUpperCase()) {
      case "SUCCEEDED" ->
          orders
              .bySettlementReference(callback.paymentReference())
              .ifPresentOrElse(
                  orders::settle,
                  () ->
                      log.warn(
                          "Payment callback for an unknown session {}",
                          callback.paymentReference()));
      case "FAILED" -> orders.settlementFailed(callback.paymentReference(), callback.reason());
      default -> log.debug("Payment outcome {} is not one a sale acts on", callback.outcome());
    }

    return ResponseEntity.ok().build();
  }

  record Callback(String paymentReference, String outcome, String reason) {}
}
