package ro.bid4.backend.payments.service;

public record CheckoutSession(String providerReference, String redirectUrl) {}
