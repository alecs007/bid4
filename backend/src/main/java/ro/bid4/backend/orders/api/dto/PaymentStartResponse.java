package ro.bid4.backend.orders.api.dto;

/**
 * What comes back from asking to pay.
 *
 * @param order the sale as it stands now: PAID_HELD against a provider that settles immediately,
 *     still AWAITING_PAYMENT against one that redirects, because the buyer has not paid yet
 * @param redirectUrl where to send the buyer, or null when there is nowhere to send them
 */
public record PaymentStartResponse(OrderResponse order, String redirectUrl) {}
