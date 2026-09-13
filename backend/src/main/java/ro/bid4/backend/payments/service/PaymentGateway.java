package ro.bid4.backend.payments.service;

/**
 * The payment provider, as the rest of the application needs it.
 *
 * <p>Deliberately the hosted-checkout shape: bid4 asks for a session, sends the buyer to it, and
 * learns the outcome from a webhook. No card details reach this application in that model, which is
 * the whole reason for choosing it, and it is why there is no {@code charge(card)} here and never
 * should be.
 *
 * <p>Implementing Stripe means writing one class against this interface and pointing {@code
 * bid4.payments.provider} at it. What the order state machine does with the answer does not change,
 * because it already treats payment as something that happens elsewhere and is reported.
 */
public interface PaymentGateway {

  /**
   * Opens a checkout for a sale and returns where to send the buyer.
   *
   * <p>Must be idempotent on {@link PaymentIntent#orderReference()}: a buyer who presses pay twice,
   * or reloads the redirect, must arrive at one checkout rather than two, or the sale can be paid
   * for twice and one of them has to be refunded.
   */
  CheckoutSession open(PaymentIntent intent);

  /**
   * Whether this provider settles instantly.
   *
   * <p>The stub does: there is no redirect and no webhook, so the caller completes the sale itself
   * rather than waiting for a callback that will never arrive. A real provider answers false, and
   * the order stays AWAITING_PAYMENT until the webhook says otherwise.
   */
  boolean settlesImmediately();

  String name();
}
