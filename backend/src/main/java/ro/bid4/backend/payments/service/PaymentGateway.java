package ro.bid4.backend.payments.service;

public interface PaymentGateway {
  CheckoutSession open(PaymentIntent intent);

  boolean settlesImmediately();

  String name();
}
