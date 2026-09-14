package ro.bid4.backend.payments.service;

public record PaymentIntent(
    String orderReference,
    long amount,
    String currency,
    String description,
    String buyerEmail,
    String returnUrl) {
  public static final String RON = "RON";
}
