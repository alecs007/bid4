package ro.bid4.backend.orders.api;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ro.bid4.backend.orders.api.dto.ChooseDeliveryRequest;
import ro.bid4.backend.orders.api.dto.OrderResponse;
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
   * <p>A stub until phase three, and deliberately shaped like the thing that replaces it — the
   * caller asks for the order to be paid and is told what state it ended in, rather than being
   * handed a provider's session to reason about.
   */
  @PostMapping("/{id}/payment")
  OrderResponse pay(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
    return mapper.toResponse(orders.markPaid(id, Viewers.from(jwt)));
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
}
