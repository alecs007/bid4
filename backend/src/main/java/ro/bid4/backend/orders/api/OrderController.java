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

/**
 * The sale, over HTTP.
 *
 * <p>One route per step, named after what the person pressing it is doing rather than after the
 * status it produces — the caller says "I have sent it", and what that means for the row is the
 * service's business.
 *
 * <p>There is no route to a status. Nothing here accepts a target state, so no request can put a
 * sale anywhere except one step further along from wherever it actually is.
 */
@RestController
@RequestMapping("/orders")
public class OrderController {

  private final OrderService orders;
  private final OrderMapper mapper;

  public OrderController(OrderService orders, OrderMapper mapper) {
    this.orders = orders;
    this.mapper = mapper;
  }

  /**
   * Every sale this account is a party to, newest first.
   *
   * <p>{@code role} narrows it to one side: a buyer asking what they owe and a seller asking what
   * they are owed are two different lists, and /cont/comenzi and /cont/vanzari are two screens.
   * Omitted, it answers both sides, which is what a single "my orders" view would want.
   *
   * <p>This route did not exist. Both order screens called it and got a 404, so a signed-in person
   * with fourteen sales in the database saw an empty list and no error worth reading.
   */
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

  /** Buyer: where it goes. This is what makes the total knowable. */
  @PutMapping("/{id}/delivery")
  OrderResponse chooseDelivery(
      @PathVariable UUID id,
      @Valid @RequestBody ChooseDeliveryRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(
        orders.chooseDelivery(id, request.deliveryMethodId(), Viewers.from(jwt)));
  }

  /**
   * Buyer: pay.
   *
   * <p>Answers the sale plus somewhere to go, because a hosted checkout is a redirect out and back
   * and the client has to be told where. Against a provider that settles immediately there is
   * nowhere to go and the sale comes back already paid, which is what the stub does today.
   *
   * <p>The shape is the point: wiring a real provider in changes which of the two fields is filled,
   * and nothing about this route or its callers.
   */
  @PostMapping("/{id}/payment")
  PaymentStartResponse pay(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toPaymentStart(orders.markPaid(id, Viewers.from(jwt)));
  }

  /** Seller: get an AWB. */
  @PostMapping("/{id}/label")
  OrderResponse label(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(orders.generateLabel(id, Viewers.from(jwt)));
  }

  /** Seller: it is with the courier. The last thing either party says about the journey. */
  @PostMapping("/{id}/dispatch")
  OrderResponse dispatch(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(orders.markDroppedOff(id, Viewers.from(jwt)));
  }

  /** Buyer: it arrived and it is right. This is what releases the money. */
  @PostMapping("/{id}/receipt")
  OrderResponse confirmReceipt(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(orders.confirmReceipt(id, Viewers.from(jwt)));
  }

  /** What both parties agreed to on this sale, and when. */
  @GetMapping("/{id}/agreements")
  List<AgreementResponse> agreements(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toAgreements(orders.agreementsFor(id, Viewers.from(jwt)));
  }

  /** Either party, while the escrow is still empty. After payment it is a dispute, not a cancel. */
  @PostMapping("/{id}/cancel")
  OrderResponse cancel(
      @PathVariable UUID id,
      @RequestBody(required = false) @Valid CancelOrderRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    String reason = request == null ? null : request.reason();
    return mapper.toResponse(orders.cancel(id, reason, Viewers.from(jwt)));
  }

  /**
   * Operator: settle a frozen sale.
   *
   * <p>The role is checked in the service rather than only here, because this moves money and a
   * route annotation is the wrong place for the only check that stands between an ordinary account
   * and somebody else's escrow.
   */
  @PostMapping("/{id}/dispute/resolve")
  @PreAuthorize("hasAnyRole('OPERATOR','ADMIN')")
  OrderResponse resolveDispute(
      @PathVariable UUID id,
      @RequestBody @Valid ResolveDisputeRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(
        orders.resolveDispute(id, request.outcome(), request.note(), Viewers.from(jwt)));
  }

  /** Buyer: it arrived and it is not right. The money stops where it is until this is settled. */
  @PostMapping("/{id}/dispute")
  OrderResponse openDispute(
      @PathVariable UUID id,
      @RequestBody(required = false) @Valid OpenDisputeRequest request,
      @AuthenticationPrincipal Jwt jwt) {
    String reason = request == null ? null : request.reason();
    return mapper.toResponse(orders.openDispute(id, reason, Viewers.from(jwt)));
  }
}
