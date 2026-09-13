package ro.bid4.backend.payments.service;

import java.util.concurrent.ThreadLocalRandom;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * A provider that takes no money.
 *
 * <p>It settles immediately and has no redirect, so the sale can be walked from acceptance to
 * release without an account anywhere. That is the only difference that matters to a caller, and it
 * is asked about explicitly rather than inferred from a null URL.
 *
 * <p>It does not simulate declines. A stub that fails one payment in eight makes every other
 * failure in the system harder to read, and PAYMENT_FAILED is reachable on demand from the seeder.
 */
@Component
@ConditionalOnProperty(name = "bid4.payments.provider", havingValue = "stub", matchIfMissing = true)
public class StubPaymentGateway implements PaymentGateway {

  @Override
  public CheckoutSession open(PaymentIntent intent) {
    String reference = "stub_%011d".formatted(ThreadLocalRandom.current().nextLong(1_000_000_000L));
    return new CheckoutSession(reference, null);
  }

  @Override
  public boolean settlesImmediately() {
    return true;
  }

  @Override
  public String name() {
    return "stub";
  }
}
