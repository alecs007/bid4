package ro.bid4.backend.payments.service;

/**
 * What is being paid for.
 *
 * <p>Amounts in bani, as everywhere else in this application. The currency is explicit rather than
 * assumed, because a provider account can be configured for more than one and a silent default is
 * how a sale gets charged in the wrong one.
 *
 * @param orderReference the human reference, which is also the idempotency key
 * @param returnUrl where the provider sends the buyer back to, whatever the outcome
 */
public record PaymentIntent(
    String orderReference,
    long amount,
    String currency,
    String description,
    String buyerEmail,
    String returnUrl) {

  public static final String RON = "RON";
}
