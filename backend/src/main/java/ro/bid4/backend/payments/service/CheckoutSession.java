package ro.bid4.backend.payments.service;

/**
 * An opened checkout.
 *
 * @param providerReference the provider's id for it, stored on the order so a webhook naming it can
 *     be matched back and so support has something to quote
 * @param redirectUrl where the buyer goes to pay; null when the provider settles immediately
 */
public record CheckoutSession(String providerReference, String redirectUrl) {}
