package ro.bid4.backend.orders.api;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.orders.api.dto.AgreementResponse;
import ro.bid4.backend.orders.api.dto.CancelOrderRequest;
import ro.bid4.backend.orders.api.dto.ChooseDeliveryRequest;
import ro.bid4.backend.orders.api.dto.OpenDisputeRequest;
import ro.bid4.backend.orders.api.dto.OrderResponse;
import ro.bid4.backend.orders.api.dto.PaymentStartResponse;
import ro.bid4.backend.orders.api.dto.ResolveDisputeRequest;
import ro.bid4.backend.orders.api.dto.TrackingEventResponse;
import ro.bid4.backend.orders.service.OrderMapper;
import ro.bid4.backend.orders.service.OrderService;
import ro.bid4.backend.security.web.Viewers;

@RestController
@RequestMapping("/orders")
public class OrderController {
  private final OrderService orders;
  private final OrderMapper mapper;

  public OrderController(OrderService orders, OrderMapper mapper) {
    this.orders = orders;
    this.mapper = mapper;
  }

  @GetMapping
  List<OrderResponse> list(
      @RequestParam(required = false) String role, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponses(orders.forParty(role, Viewers.from(jwt)));
  }

  @GetMapping("/{id}")
  OrderResponse get(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(orders.get(id, Viewers.from(jwt)));
  }

  @GetMapping("/{id}/tracking")
  List<TrackingEventResponse> tracking(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return orders.trackingFor(id, Viewers.from(jwt)).stream().map(mapper::toTracking).toList();
  }

  @PutMapping("/{id}/delivery")
  OrderResponse chooseDelivery(
      @PathVariable UUID id,
      @Valid @RequestBody ChooseDeliveryRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(
        orders.chooseDelivery(id, request.deliveryMethodId(), Viewers.from(jwt)));
  }

  @PostMapping("/{id}/payment")
  PaymentStartResponse pay(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toPaymentStart(orders.markPaid(id, Viewers.from(jwt)));
  }

  @PostMapping("/{id}/label")
  OrderResponse label(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(orders.generateLabel(id, Viewers.from(jwt)));
  }

  @PostMapping("/{id}/dispatch")
  OrderResponse dispatch(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(orders.markDroppedOff(id, Viewers.from(jwt)));
  }

  @PostMapping("/{id}/receipt")
  OrderResponse confirmReceipt(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(orders.confirmReceipt(id, Viewers.from(jwt)));
  }

  @GetMapping("/{id}/agreements")
  List<AgreementResponse> agreements(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toAgreements(orders.agreementsFor(id, Viewers.from(jwt)));
  }

  @PostMapping("/{id}/cancel")
  OrderResponse cancel(
      @PathVariable UUID id,
      @RequestBody(required = false) @Valid CancelOrderRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    String reason = request == null ? null : request.reason();
    return mapper.toResponse(orders.cancel(id, reason, Viewers.from(jwt)));
  }

  @PostMapping("/{id}/dispute/resolve")
  @PreAuthorize("hasAnyRole('OPERATOR','ADMIN')")
  OrderResponse resolveDispute(
      @PathVariable UUID id,
      @RequestBody @Valid ResolveDisputeRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(
        orders.resolveDispute(id, request.outcome(), request.note(), Viewers.from(jwt)));
  }

  @PostMapping("/{id}/dispute")
  OrderResponse openDispute(
      @PathVariable UUID id,
      @RequestBody(required = false) @Valid OpenDisputeRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    String reason = request == null ? null : request.reason();
    return mapper.toResponse(orders.openDispute(id, reason, Viewers.from(jwt)));
  }
}
