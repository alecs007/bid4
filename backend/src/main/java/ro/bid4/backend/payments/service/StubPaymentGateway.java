package ro.bid4.backend.payments.service;

import java.util.concurrent.ThreadLocalRandom;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

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
